import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker, Notebook, NotebookPanel} from '@jupyterlab/notebook';
import { ToolbarButton } from '@jupyterlab/apputils';
import { IDisposable } from '@lumino/disposable';
import { Widget } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
import { Cell, CodeCell, ICellModel, MarkdownCell } from '@jupyterlab/cells';
import ColorThief from 'colorthief';

function hexToRgb(hex: string): { r: number, g: number, b: number } {
  // Remove the leading hash if it's there
  hex = hex.replace(/^#/, '');

  // Parse the r, g, b values
  let bigint = parseInt(hex, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;

  return { r, g, b };
}

function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrastRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function normalizeContrast(contrast: number): number {
  const maxContrast = 21; // Theoretical max contrast ratio
  const scaledContrast = (contrast - 1) / (maxContrast - 1);
  return scaledContrast * 20; // Scale to a 0-20 range
}

function calculateContrast(foregroundHex: string, backgroundHex: string): number {
  const fgRgb = hexToRgb(foregroundHex);
  const bgRgb = hexToRgb(backgroundHex);

  const fgLuminance = luminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = luminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const contrast = contrastRatio(fgLuminance, bgLuminance);
  return normalizeContrast(contrast);
}

async function getImageContrast(imageSrc: string, notebookPath: string, cellColor: string, numClusters: number = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Needed if the image is served from a different domain
    
    try {
      new URL(imageSrc);
      img.src = imageSrc;
    } catch (_) {
      const baseUrl = document.location.origin;
      var finalPath = `${baseUrl}/files/${imageSrc}`
      // console.log(finalPath);
      img.src = finalPath;
    }

    img.onload = () => {
      const colorThief = new ColorThief();
      // const dominantColor = colorThief.getColor(img); // Gets the dominant color

      const p = colorThief.getPalette(img, 3); // Get top 3 dominant colors
      let palette: string[] = [];
      p.forEach(c => {
        var col = "#" + ((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1).toUpperCase();
        palette.push(col)
      })
      console.log('Color Palette:', palette);

      var highestContrast = -1;
      var colorHighestContrast = "";

      // console.log(cellColor);

      let contrast = calculateContrast(palette[0], cellColor);
      if (contrast > highestContrast){
        // console.log("step 1");
        highestContrast = contrast;
        colorHighestContrast = palette[0]
      }
      contrast = calculateContrast(palette[1], cellColor);
      if (contrast > highestContrast){
        // console.log("step 2");
        highestContrast = contrast;
        colorHighestContrast = palette[1]
      }
      contrast = calculateContrast(palette[2], cellColor);
      if (contrast > highestContrast){
        // console.log("step 3");
        highestContrast = contrast;
        colorHighestContrast = palette[2]
      }

      // console.log(`Dominant Color: ${colorHighestContrast} vs cell color: ${cellColor}. Contrast: ${highestContrast}`);
      resolve(`${highestContrast} contrast ${colorHighestContrast}`);

    };

    img.onerror = () => reject('Failed to load image');
  });
}

async function checkAllCells(notebookContent: Notebook, altCellList: AltCellList, isEnabled: () => boolean, myPath: string) {
  const headingsMap: Array<{headingLevel: number, myCell: Cell, heading: string }> = [];

  notebookContent.widgets.forEach(async cell => {
    if (isEnabled()){
      //Image transparency, contrast, and alt checking
      const mdCellIssues = await checkTextCellForImageWithAccessIssues(cell, myPath);
      const codeCellHasTransparency = await checkCodeCellForImageWithAccessIssues(cell, myPath);
      var issues = mdCellIssues.concat(codeCellHasTransparency);
      applyVisualIndicator(altCellList, cell, issues);

      //header ordering checking
      if (cell.model.type === 'markdown') {
        const mCell = cell as MarkdownCell;

        const cellText = mCell.model.toJSON().source.toString();
        const markdownHeadingRegex = /^(#+) \s*(.*)$/gm;
        const htmlHeadingRegex = /<h(\d+)>(.*?)<\/h\1>/gi;

        let match;
        while ((match = markdownHeadingRegex.exec(cellText)) !== null) {
          const level = match[1].length;  // The level is determined by the number of '#'
          headingsMap.push({headingLevel: level, heading: `${match[2].trim()}`, myCell: mCell});
        }

        while ((match = htmlHeadingRegex.exec(cellText)) !== null) {
          const level = parseInt(match[1]);  // The level is directly captured by the regex
          headingsMap.push({headingLevel: level, heading: `${match[2].trim()}`, myCell: mCell });
        }
      }

      // console.log("Extracted Headings with Cell IDs:", headingsMap);
      
      if (headingsMap.length > 0){
        let previousLevel = headingsMap[0].headingLevel;
        let highestLevel = previousLevel;
        const errors: Array<{myCell: Cell, current: string, expected: string}> = [];
  
        headingsMap.forEach((heading, index) => {
          if (heading.headingLevel > previousLevel + 1) {
            // If the current heading level skips more than one level
            errors.push({
              myCell: heading.myCell,
              current: `h${heading.headingLevel}`,
              expected: `h${previousLevel + 1}`
            });
          } else if (heading.headingLevel < highestLevel){
            //if the header is higher than the first ever header
            errors.push({
              myCell: heading.myCell,
              current: `h${heading.headingLevel}`,
              expected: `h${highestLevel}`
            });
          }
  
          previousLevel = heading.headingLevel;
        });
  
        errors.forEach(e => {
          applyVisualIndicator(altCellList, e.myCell, ["heading " + e.current + " " + e.expected]);
        });
      }
    } else {
      applyVisualIndicator(altCellList, cell, []);
    }
  });

  // altCellList.showOnlyVisibleCells();
}
      
function getImageTransparency(imgString: string, notebookPath: string): Promise<String> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Needed for CORS-compliant images

    try {
      new URL(imgString);
      img.src = imgString;
    } catch (_) {
      const baseUrl = document.location.origin;
      var finalPath = `${baseUrl}/files/${imgString}`
      img.src = finalPath;
    }

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const context = canvas.getContext('2d');
      if (!context) {
        console.log('Failed to get canvas context');
        resolve(10 + " transp");
        return;
      }

      context.drawImage(img, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let transparentPixelCount = 0;
      const totalPixels = data.length / 4;

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          transparentPixelCount++;
        }
      }

      const transparencyPercentage = (transparentPixelCount / totalPixels) * 100;      
      resolve((10 - transparencyPercentage/10) + " transp");
    };

    img.onerror = () => reject('Failed to load image');
  });
}

async function checkHtmlNoAccessIssues(htmlString: string, myPath: string, cellColor: string): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const images = doc.querySelectorAll("img");
  
    let accessibilityTests: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.hasAttribute("alt") || img.getAttribute("alt") === "") {
        accessibilityTests.push("Alt");
      }
    }

    const transparencyPromises = Array.from(images).map((img: HTMLImageElement) => getImageTransparency(img.src, myPath));
    const transparency = await Promise.all(transparencyPromises);

    const colorContrastPromises = Array.from(images).map((img: HTMLImageElement) => getImageContrast(img.src, myPath, cellColor));
    const colorContrast =  await Promise.all(colorContrastPromises);
  
    accessibilityTests = [...accessibilityTests, ...transparency.map(String), ...colorContrast.map(String)];
    
    resolve(accessibilityTests);
  });
}

async function checkMDNoAccessIssues(mdString: string, myPath: string, cellColor: string): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    const imageNoAltRegex = /!\[\](\([^)]+\))/g;
    const allImagesRegex = /!\[.*?\]\((.*?)\)/g;
    let accessibilityTests: string[] = [];
  
    let match: RegExpExecArray | null;
    const imageUrls: string[] = [];
  
    while ((match = allImagesRegex.exec(mdString)) !== null) {
        const imageUrl = match[1];
        if (imageUrl) {
            imageUrls.push(imageUrl);
        }
    }
  
    if (imageNoAltRegex.test(mdString)){
      accessibilityTests.push("Alt");
    }
    
    const transparencyPromises = Array.from(imageUrls).map((i: string) => getImageTransparency(i, myPath));
    const transparency = await Promise.all(transparencyPromises);

    const colorContrastPromises = Array.from(imageUrls).map((i: string) => getImageContrast(i, myPath, cellColor));
    const colorContrast = await Promise.all(colorContrastPromises);
  
    accessibilityTests = [...accessibilityTests, ...transparency.map(String), ...colorContrast.map(String)];
  
    resolve(accessibilityTests);
  });
}

async function checkTextCellForImageWithAccessIssues(cell: Cell, myPath: string): Promise<string[]> {
  if(cell.model.type == 'markdown'){
    cell = cell as MarkdownCell;
    const cellText = cell.model.toJSON().source.toString();
    
    const markdownNoAlt = await checkMDNoAccessIssues(cellText, myPath, document.body.style.getPropertyValue("--fill-color"));
    const htmlNoAlt = await checkHtmlNoAccessIssues(cellText, myPath, document.body.style.getPropertyValue("--fill-color"));
    var issues = htmlNoAlt.concat(markdownNoAlt)
    return issues;
  } else {
    return [];
  }
}

async function checkCodeCellForImageWithAccessIssues(cell: Cell, myPath: string): Promise<string[]> {
  if(cell.model.type == 'code'){
    const codeCell = cell as CodeCell;
    const outputText = codeCell.outputArea.node.outerHTML;

    const generatedOutputImageIssues = await checkHtmlNoAccessIssues(outputText, myPath, document.body.style.getPropertyValue("--fill-color"));
    return generatedOutputImageIssues;
  } else {
    return [];
  }
}

async function attachContentChangedListener(notebookContent: Notebook, altCellList: AltCellList, cell: Cell, isEnabled: () => boolean, myPath: string) {
  //for each existing cell, attach a content changed listener
  cell.model.contentChanged.connect(async (sender, args) => {
    await checkAllCells(notebookContent, altCellList, isEnabled, myPath);
  });
  
}

function applyVisualIndicator(altCellList: AltCellList, cell: Cell, listIssues: string[]) {
  const indicatorId = 'accessibility-indicator-' + cell.model.id;
  altCellList.removeCell(cell.model.id);

  while(document.getElementById(indicatorId)){
    document.getElementById(indicatorId)?.remove();
  }

  let applyIndic = false;

  for (let i = 0; i < listIssues.length; i++) {

    if (listIssues[i].slice(0,7) == "heading") { //heading h1 h1
      altCellList.addCell(cell.model.id, "Heading format: expecting " + listIssues[i].slice(11, 13) + ", got " + listIssues[i].slice(8, 10));
      applyIndic = true;
    } else if(listIssues[i].split(" ")[1] == "contrast"){
      var score = Number(listIssues[i].split(" ")[0]);
      if (score < 5) {
        altCellList.addCell(cell.model.id, "Cell Error: Image Contrast " + listIssues[i].split(" ")[2]);
        applyIndic = true;
      }
    } else if (listIssues[i] == "Alt") {
      altCellList.addCell(cell.model.id, "Cell Error: Missing Alt Tag");
      applyIndic = true;
    } else {
      var score = Number(listIssues[i].split(" ")[0]);
      if (score < 9) {
        altCellList.addCell(cell.model.id, "Image Err: High Image Transparency (" + ((10-score)*10).toFixed(2) + "%)");
        applyIndic = true;
      }
    }
  }
  
  
  if (applyIndic) {
    if (!document.getElementById(indicatorId)) {
      var indicator = document.createElement('div');
      indicator.id = indicatorId;
      indicator.style.position = 'absolute';
      indicator.style.top = '30px';
      indicator.style.left = '45px';
      indicator.style.width = '15px';
      indicator.style.height = '15px';
      indicator.style.borderRadius = '50%';
      indicator.style.backgroundColor = '#ff8080';
      cell.node.appendChild(indicator);
    }
  } else {
    let indicator = document.getElementById(indicatorId);
    indicator?.remove();
    altCellList.removeCell(cell.model.id);
  }

}

async function addToolbarButton(labShell: ILabShell, altCellList: AltCellList, notebookPanel: NotebookPanel, isEnabled: () => boolean, toggleEnabled: () => void, myPath: string): Promise<IDisposable> {
  
  console.log("make button")

  const button = new ToolbarButton({

    label: '🌐 a11y Checker',
    onClick: () => {
      toggleEnabled();
      if(isEnabled()){
        labShell.activateById("AltCellList");
      } else {
        labShell.collapseRight();
      }
      
      checkAllCells(notebookPanel.content, altCellList, isEnabled, myPath);
    },

    tooltip: 'Toggle Alt-text Check'
  });

  button.id = "alt-text-check-toggle";
  notebookPanel.toolbar.insertItem(10, 'altTextCheck', button);
  
  let elem = document.getElementById('alt-text-check-toggle');
  elem!.style.backgroundColor = '#0000';

  return button;
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_accessibility:plugin',
  autoStart: true,
  requires: [INotebookTracker, ILabShell],
  activate: (app: JupyterFrontEnd, notebookTracker: INotebookTracker, labShell: ILabShell) => {
    console.log("before wait")
    new Promise<void>(resolve => {
      setTimeout(resolve, 0);
    }).then(() => {

      console.log('JupyterLab extension jupyterlab_accessibility is activated!');

      let isEnabled = true;
      // Function to toggle the isEnabled state
      const toggleEnabled = () => {
        isEnabled = !isEnabled;
        console.log(`Accessibility checks ${isEnabled ? 'enabled' : 'disabled'}.`);
      };

      const accessibilityIcon = new LabIcon({
        name: 'accessibility',
        svgstr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#154F92" d="M256 48c114.953 0 208 93.029 208 208 0 114.953-93.029 208-208 208-114.953 0-208-93.029-208-208 0-114.953 93.029-208 208-208m0-40C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 56C149.961 64 64 149.961 64 256s85.961 192 192 192 192-85.961 192-192S362.039 64 256 64zm0 44c19.882 0 36 16.118 36 36s-16.118 36-36 36-36-16.118-36-36 16.118-36 36-36zm117.741 98.023c-28.712 6.779-55.511 12.748-82.14 15.807.851 101.023 12.306 123.052 25.037 155.621 3.617 9.26-.957 19.698-10.217 23.315-9.261 3.617-19.699-.957-23.316-10.217-8.705-22.308-17.086-40.636-22.261-78.549h-9.686c-5.167 37.851-13.534 56.208-22.262 78.549-3.615 9.255-14.05 13.836-23.315 10.217-9.26-3.617-13.834-14.056-10.217-23.315 12.713-32.541 24.185-54.541 25.037-155.621-26.629-3.058-53.428-9.027-82.141-15.807-8.6-2.031-13.926-10.648-11.895-19.249s10.647-13.926 19.249-11.895c96.686 22.829 124.283 22.783 220.775 0 8.599-2.03 17.218 3.294 19.249 11.895 2.029 8.601-3.297 17.219-11.897 19.249z"/></svg>'
      });

      const altCellList: AltCellList = new AltCellList(notebookTracker);
      altCellList.id = 'AltCellList'; // Widgets need an id
      altCellList.title.icon = accessibilityIcon;
      labShell.add(altCellList, 'right');
      labShell.activateById('AltCellList');
      
      // When a new notebook is created or opened, add the toolbar button
      notebookTracker.widgetAdded.connect((sender, notebookPanel: NotebookPanel) => {
        console.log("able to add toolbar button");
        addToolbarButton(labShell, altCellList, notebookPanel, () => isEnabled, toggleEnabled, notebookTracker.currentWidget!.context.path);
      });

      notebookTracker.currentChanged.connect((sender, notebookPanel) => {
        if (!notebookPanel) return;
        
        notebookPanel.context.ready.then(() => {
          const { content } = notebookPanel;

          //for each existing cell, attach a content changed listener
          content.widgets.forEach(async cell => {
            attachContentChangedListener(content, altCellList, cell, () => isEnabled, notebookTracker.currentWidget!.context.path);
          });

          checkAllCells(content, altCellList, () => isEnabled, notebookTracker.currentWidget!.context.path)

          //every time a cell is added, attach a content listener to it
          if (content.model) {
            content.model.cells.changed.connect((sender, args) => {
              if (args.type === 'add') {
                args.newValues.forEach(async (cellModel: ICellModel) => {
                  const cell = content.widgets.find(c => c.model.id === cellModel.id);
                  if(cell){
                    const newCell = cell as Cell
                    attachContentChangedListener(content, altCellList, newCell, () => isEnabled, notebookTracker.currentWidget!.context.path);
                    await checkAllCells(content, altCellList, () => isEnabled, notebookTracker.currentWidget!.context.path);
                  }          
                });
              }
            });
          }
        });
      });
    });
  }
};

class AltCellList extends Widget {
  
  private _listCells: HTMLElement;
  private _cellMap: Map<string, HTMLElement[]>;
  private _notebookTracker: INotebookTracker;

  constructor(notebookTracker: INotebookTracker) {
    super();
    this._cellMap = new Map<string, HTMLElement[]>();
    this._listCells = document.createElement('div');
    this._notebookTracker = notebookTracker;

    let title = document.createElement('h2');
    title.innerHTML = "Cells with Accessibility Issues";
    title.style.margin = '15px';

    this.node.appendChild(title);
    this.node.appendChild(this._listCells);
  }

  addCell(cellId: string, buttonContent: string): void {
    const listItem = document.createElement('div');
    listItem.id = 'cell-' + cellId + "_" + buttonContent;
    listItem.style.display = 'flex';
    listItem.style.alignItems = 'center';
    listItem.style.flexWrap = 'nowrap';

    const button = document.createElement('button');
    button.classList.add("jp-toast-button");
    button.classList.add("jp-mod-link");
    button.classList.add("jp-mod-small");
    button.classList.add("jp-Button");
    button.style.margin = '5px';
    button.style.marginRight = '5px';
    button.style.marginLeft = '7px';
    button.style.flexShrink = '1';
    button.textContent = buttonContent;
    

    button.addEventListener('click', () => {
      this.scrollToCell(cellId);
    });

    //more information icon
    const infoIcon = document.createElement('span');
    infoIcon.innerHTML = '&#9432;';
    infoIcon.style.cursor = 'pointer';
    infoIcon.style.marginRight = '5px';

    const dropdown = document.createElement('div');
    dropdown.style.display = 'none';
    dropdown.style.marginLeft = '50px';
    dropdown.style.marginRight = '50px';
    dropdown.style.backgroundColor = 'white';
    dropdown.style.border = '1px solid black';
    dropdown.style.padding = '5px';
    
    const link = document.createElement('a');
    if (buttonContent.includes("Transparency")){
      link.href = "https://www.w3.org/WAI/WCAG21/Understanding/use-of-color";
      link.textContent = "WCAG transparency guidelines";
    } else if(buttonContent.includes("Heading")){
      link.href = "https://www.w3.org/WAI/tutorials/page-structure/headings/";
      link.textContent = "WCAG headings guidelines";
    } else if(buttonContent.includes("Alt")){
      link.href = "https://www.w3.org/TR/WCAG20-TECHS/H37.html";
      link.textContent = "WCAG alt-text guidelines";
    } else if(buttonContent.includes("Contrast")){
      link.href = "https://www.w3.org/WAI/WCAG21/Understanding/use-of-color";
      link.textContent = "WCAG contrast guidelines";
    }
    link.style.color = "#069";
    link.style.textDecoration = "underline";
    
    link.target = "_blank";
    dropdown.appendChild(link);

    // Toggle dropdown on info icon click
    infoIcon.addEventListener('click', () => {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    var add = true;

    if (this._cellMap.has(cellId)){
      var existingList = this._cellMap.get(cellId)
      existingList!.forEach(b => {          
        if (b.textContent == buttonContent) {
          add = false;
        }
      })

      existingList!.push(listItem)
      this._cellMap.set(cellId, existingList!);
    } else {
      this._cellMap.set(cellId, [listItem]);
    }

    
    if (add) {
      listItem.appendChild(button);
      listItem.appendChild(infoIcon);
      listItem.appendChild(dropdown);
      this._listCells.appendChild(listItem);
    }

    this.showOnlyVisibleCells();
  }

  removeCell(cellId: string): void {
    //get list of error buttons related to this cell
    const listItem = this._cellMap.get(cellId);

    if (listItem != null){
      listItem.forEach((btn) => {

      for (let item of this._listCells.children) {
        if (btn.id == item.id) {
          this._listCells.removeChild(btn);
        }
      }
          
      });
    }
    if(this._cellMap.has(cellId)){
      this._cellMap.delete(cellId);
    }
  }

  scrollToCell(cellId: string): void {
    const notebookPanel = this._notebookTracker.currentWidget;
    const notebook = notebookPanel!.content;
    
    for (let i = 0; i < notebook.widgets.length; i++) {
      const cell = notebook.widgets[i];
      if (cell.model.id === cellId) {
        cell.node.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const originalStyle = cell.node.style.transition;
        cell.node.style.transition = 'background-color 0.5s ease';
        cell.node.style.backgroundColor = '#ffff99';
        setTimeout(() => {
          cell.node.style.backgroundColor = '';
          cell.node.style.transition = originalStyle;
        }, 800); // Flash duration
      }
    }
  }

  showOnlyVisibleCells(): void {
    var keyList = Array.from(this._cellMap.keys());
    const notebookPanel = this._notebookTracker.currentWidget;
    const notebook = notebookPanel!.content;

    keyList.forEach(k => {
      var cellExists = false;
      for (let i = 0; i < notebook.widgets.length; i++) {
        const cell = notebook.widgets[i];
        if (cell.model.id === k) {
          cellExists = true;
          break
        }
      }
      if(!cellExists){
        this.removeCell(k);
      }
    });
  }
  
}
export default plugin;