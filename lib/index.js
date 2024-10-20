import { ILabShell } from '@jupyterlab/application';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ToolbarButton } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
// import ColorThief from 'colorthief';
import Tesseract from 'tesseract.js';
function calculateContrast(foregroundHex, backgroundHex) {
    //convert hex string to tuple of rgb
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }
    //calulate luminance using wcag docs formula 
    function calculateLuminance(rgb) {
        const a = [rgb.r, rgb.g, rgb.b].map(function (v) {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function getContrastRatio(color1, color2) {
        const rgb1 = hexToRgb(color1);
        const rgb2 = hexToRgb(color2);
        const L1 = calculateLuminance(rgb1);
        const L2 = calculateLuminance(rgb2);
        const lighter = Math.max(L1, L2);
        const darker = Math.min(L1, L2);
        return (lighter + 0.05) / (darker + 0.05);
    }
    try {
        const contrast = getContrastRatio(foregroundHex, backgroundHex);
        return contrast;
    }
    catch (_a) {
        return 21;
    }
}
async function determineTextColor(imageData, imagePath, scale) {
    const result = await Tesseract.recognize(imagePath, 'eng', {});
    const words = result.data.words;
    if (words.length === 0) {
        throw new Error('No text found in the image');
    }
    let minContrast = 21;
    words.forEach(word => {
        //Filter out nonsense detections
        if (word.confidence >= 85 && word.text != "|" && word.text != "-" && word.text != "_" && word.text != "/" && word.text != "=") {
            const bbox = word.bbox;
            const colorCount = {};
            const data = imageData.data;
            const width = imageData.width;
            //for each bounding box, find the most common clors and store them in a dictionary
            for (let y = bbox.y0; y <= bbox.y1; y++) {
                for (let x = bbox.x0; x <= bbox.x1; x++) {
                    const index = (y * width + x) * 4;
                    const { r, g, b } = { r: data[index], g: data[index + 1], b: data[index + 2] };
                    const colorKey = "#" + ((1 << 24) + (Math.floor(r / scale) * scale << 16) + (Math.floor(g / scale) * scale << 8) + Math.floor(b / scale) * scale).toString(16).slice(1).toUpperCase();
                    colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;
                }
            }
            var bgcol = Object.entries(colorCount).sort((a, b) => b[1] - a[1])[0][0]; //most common
            var fgcol = Object.entries(colorCount).sort((a, b) => b[1] - a[1])[1][0]; //second most common (text color)
            // console.log(colorCount)
            let contrast = calculateContrast(fgcol, bgcol);
            // console.log(word.text + " " + word.confidence + " " + fgcol + " vs. " + bgcol + " with contrast " + contrast);
            //find the word with minimum contrast to flag as an issue
            if (contrast < minContrast) {
                minContrast = contrast;
            }
        }
    });
    return minContrast;
}
async function getTextContrast(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Needed if the image is served from a different domain
        //distunguish between local or hosted url
        try {
            new URL(imageSrc);
            img.src = imageSrc;
        }
        catch (_) {
            const baseUrl = document.location.origin;
            var finalPath = `${baseUrl}/files/${imageSrc}`;
            img.src = finalPath;
        }
        try {
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve("21 contrast 21.00:1");
                    return;
                }
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let textContrast;
                try {
                    textContrast = await determineTextColor(imageData, img.src, 30);
                }
                catch (error) {
                    console.error(error);
                    textContrast = 21; // Default to black if no text is found
                }
                resolve(`${textContrast} contrast ${textContrast.toFixed(2)}:1`);
            };
        }
        catch (_a) {
            resolve("21 contrast 21.00:1");
        }
        // img.onerror = () => reject('Failed to load image');
    });
}
function getImageTransparency(imgString, notebookPath) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Needed for CORS-compliant images
        //distunguish between local or hosted url
        try {
            new URL(imgString);
            img.src = imgString;
        }
        catch (_) {
            const baseUrl = document.location.origin;
            var finalPath = `${baseUrl}/files/${imgString}`;
            img.src = finalPath;
        }
        try {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const context = canvas.getContext('2d');
                if (!context) {
                    // console.log('Failed to get canvas context');
                    resolve(10 + " transp");
                    return;
                }
                context.drawImage(img, 0, 0);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let transparentPixelCount = 0;
                const totalPixels = data.length / 4;
                for (let i = 3; i < data.length; i += 4) {
                    //if any pixel is even slightly transparent, flag as transparent
                    if (data[i] < 255) {
                        transparentPixelCount++;
                    }
                }
                //returns ratio of ht eimage that is opaque
                const transparencyPercentage = (transparentPixelCount / totalPixels) * 100;
                resolve((10 - transparencyPercentage / 10) + " transp");
            };
        }
        catch (_a) {
            console.log('Failed to get canvas context');
            resolve(10 + " transp");
        }
    });
}
async function checkHtmlNoAccessIssues(htmlString, myPath, cellColor) {
    //Finds all possible issues within a cell while parsing it as HTML
    return new Promise(async (resolve, reject) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const images = doc.querySelectorAll("img");
        let accessibilityTests = [];
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (!img.hasAttribute("alt") || img.getAttribute("alt") === "") {
                accessibilityTests.push("Alt");
            }
        }
        const transparencyPromises = Array.from(images).map((img) => getImageTransparency(img.src, myPath));
        const transparency = await Promise.all(transparencyPromises);
        const colorContrastPromises = Array.from(images).map((img) => getTextContrast(img.src));
        const colorContrast = await Promise.all(colorContrastPromises);
        accessibilityTests = [...accessibilityTests, ...transparency.map(String), ...colorContrast.map(String)];
        resolve(accessibilityTests);
    });
}
async function checkMDNoAccessIssues(mdString, myPath, cellColor) {
    //Finds all possible issues within a cell while parsing it as markdown
    return new Promise(async (resolve, reject) => {
        const imageNoAltRegex = /!\[\](\([^)]+\))/g;
        const allImagesRegex = /!\[.*?\]\((.*?)\)/g;
        let accessibilityTests = [];
        let match;
        const imageUrls = [];
        while ((match = allImagesRegex.exec(mdString)) !== null) {
            const imageUrl = match[1];
            if (imageUrl) {
                imageUrls.push(imageUrl);
            }
        }
        if (imageNoAltRegex.test(mdString)) {
            accessibilityTests.push("Alt");
        }
        const transparencyPromises = Array.from(imageUrls).map((i) => getImageTransparency(i, myPath));
        const transparency = await Promise.all(transparencyPromises);
        const colorContrastPromises = Array.from(imageUrls).map((i) => getTextContrast(i));
        const colorContrast = await Promise.all(colorContrastPromises);
        accessibilityTests = [...accessibilityTests, ...transparency.map(String), ...colorContrast.map(String)];
        resolve(accessibilityTests);
    });
}
async function checkTextCellForImageWithAccessIssues(cell, myPath) {
    //finds all issues within a text cell by parsing it as both markdown and html
    try {
        if (cell.model.type == 'markdown') {
            cell = cell;
            const cellText = cell.model.toJSON().source.toString();
            const markdownNoAlt = await checkMDNoAccessIssues(cellText, myPath, document.body.style.getPropertyValue("--fill-color"));
            const htmlNoAlt = await checkHtmlNoAccessIssues(cellText, myPath, document.body.style.getPropertyValue("--fill-color"));
            var issues = htmlNoAlt.concat(markdownNoAlt);
            return issues;
        }
        else {
            return [];
        }
    }
    catch (_a) {
        return [];
    }
}
async function checkCodeCellForImageWithAccessIssues(cell, myPath) {
    //finds all issues in the output of a code cell.
    //output of a code cell is return in rendered html format,
    //so only need to check with html accessibility.
    try {
        if (cell.model.type == 'code') {
            const codeCell = cell;
            const outputText = codeCell.outputArea.node.outerHTML;
            const generatedOutputImageIssues = await checkHtmlNoAccessIssues(outputText, myPath, document.body.style.getPropertyValue("--fill-color"));
            return generatedOutputImageIssues;
        }
        else {
            return [];
        }
    }
    catch (_a) {
        return [];
    }
}
async function checkAllCells(notebookContent, altCellList, isEnabled, myPath, firstTime) {
    const headingsMap = [];
    notebookContent.widgets.forEach(async (cell) => {
        if (isEnabled()) {
            if (firstTime) {
                //Image transparency, contrast, and alt checking
                applyVisualIndicator(altCellList, cell, []);
                const mdCellIssues = await checkTextCellForImageWithAccessIssues(cell, myPath);
                const codeCellHasTransparency = await checkCodeCellForImageWithAccessIssues(cell, myPath);
                var issues = mdCellIssues.concat(codeCellHasTransparency);
                applyVisualIndicator(altCellList, cell, issues);
            }
            //header ordering checking
            if (cell.model.type === 'markdown') {
                const mCell = cell;
                const cellText = mCell.model.toJSON().source.toString();
                const markdownHeadingRegex = /^(#+) \s*(.*)$/gm;
                const htmlHeadingRegex = /<h(\d+)>(.*?)<\/h\1>/gi;
                let match;
                while ((match = markdownHeadingRegex.exec(cellText)) !== null) {
                    const level = match[1].length; // The level is determined by the number of '#'
                    headingsMap.push({ headingLevel: level, heading: `${match[2].trim()}`, myCell: mCell });
                }
                while ((match = htmlHeadingRegex.exec(cellText)) !== null) {
                    const level = parseInt(match[1]); // The level is directly captured by the regex
                    headingsMap.push({ headingLevel: level, heading: `${match[2].trim()}`, myCell: mCell });
                }
            }
            if (headingsMap.length > 0) {
                let previousLevel = headingsMap[0].headingLevel;
                let highestLevel = previousLevel;
                const errors = [];
                headingsMap.forEach((heading, index) => {
                    if (heading.headingLevel > previousLevel + 1) {
                        // If the current heading level skips more than one level
                        errors.push({
                            myCell: heading.myCell,
                            current: `h${heading.headingLevel}`,
                            expected: `h${previousLevel + 1}`
                        });
                    }
                    else if (heading.headingLevel < highestLevel) {
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
                    //remove any issues in the heading cell which has an error before adding the heading errors
                    applyVisualIndicator(altCellList, e.myCell, []);
                    applyVisualIndicator(altCellList, e.myCell, ["heading " + e.current + " " + e.expected]);
                });
            }
        }
        else {
            applyVisualIndicator(altCellList, cell, []);
        }
    });
    altCellList.showOnlyVisibleCells();
}
async function attachContentChangedListener(notebookContent, altCellList, cell, isEnabled, myPath) {
    //for each existing cell, attach a content changed listener
    cell.model.contentChanged.connect(async (sender, args) => {
        //this checks only the headers
        await checkAllCells(notebookContent, altCellList, isEnabled, myPath, false);
        //checks for text contrast, alt tags, and transparency
        applyVisualIndicator(altCellList, cell, []);
        const mdCellIssues = await checkTextCellForImageWithAccessIssues(cell, myPath);
        const codeCellHasTransparency = await checkCodeCellForImageWithAccessIssues(cell, myPath);
        var issues = mdCellIssues.concat(codeCellHasTransparency);
        applyVisualIndicator(altCellList, cell, issues);
    });
}
function applyVisualIndicator(altCellList, cell, listIssues) {
    var _a;
    var indicatorId;
    try {
        indicatorId = 'accessibility-indicator-' + cell.model.id;
    }
    catch (_b) {
        return;
    }
    altCellList.removeCell(cell.model.id);
    //remove all indicators (red circles) on the given cell before adding
    //a new one to remove possible duplicates
    while (document.getElementById(indicatorId)) {
        (_a = document.getElementById(indicatorId)) === null || _a === void 0 ? void 0 : _a.remove();
    }
    let applyIndic = false;
    for (let i = 0; i < listIssues.length; i++) {
        //cases for all 4 types of errors
        if (listIssues[i].slice(0, 7) == "heading") { //heading h1 h1
            altCellList.addCell(cell.model.id, "Heading format: expecting " + listIssues[i].slice(11, 13) + ", got " + listIssues[i].slice(8, 10));
            applyIndic = true;
        }
        else if (listIssues[i].split(" ")[1] == "contrast") {
            var score = Number(listIssues[i].split(" ")[0]);
            if (score < 4.5) {
                altCellList.addCell(cell.model.id, "Cell Error: Text Contrast " + listIssues[i].split(" ")[2]);
                applyIndic = true;
            }
        }
        else if (listIssues[i] == "Alt") {
            altCellList.addCell(cell.model.id, "Cell Error: Missing Alt Tag");
            applyIndic = true;
        }
        else {
            var score = Number(listIssues[i].split(" ")[0]);
            if (score < 9) {
                altCellList.addCell(cell.model.id, "Image Err: High Image Transparency (" + ((10 - score) * 10).toFixed(2) + "%)");
                applyIndic = true;
            }
        }
    }
    if (applyIndic) {
        //styling for the red indicator
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
    }
    else {
        //if there are no errors, then remove the indicator
        let indicator = document.getElementById(indicatorId);
        indicator === null || indicator === void 0 ? void 0 : indicator.remove();
        altCellList.removeCell(cell.model.id);
    }
    // altCellList.showOnlyVisibleCells();
}
async function addToolbarButton(labShell, altCellList, notebookPanel, isEnabled, toggleEnabled, myPath) {
    const button = new ToolbarButton({
        label: '🌐 a11y Checker',
        onClick: () => {
            toggleEnabled();
            if (isEnabled()) {
                labShell.activateById("AltCellList");
            }
            else {
                labShell.collapseRight();
            }
            //on toggle, check all the cells
            checkAllCells(notebookPanel.content, altCellList, isEnabled, myPath, true);
        },
        tooltip: 'Toggle Alt-text Check'
    });
    button.id = "alt-text-check-toggle";
    notebookPanel.toolbar.insertItem(0, 'altTextCheck', button);
    let elem = document.getElementById('alt-text-check-toggle');
    elem.style.backgroundColor = '#0000';
    return button;
}
const plugin = {
    id: 'jupyterlab_accessibility:plugin',
    autoStart: true,
    requires: [INotebookTracker, ILabShell],
    activate: (app, notebookTracker, labShell) => {
        console.log('JupyterLab extension jupyterlab_accessibility is activated!');
        let isEnabled = true;
        // Function to toggle the isEnabled state
        const toggleEnabled = () => {
            isEnabled = !isEnabled;
            console.log(`Accessibility checks ${isEnabled ? 'enabled' : 'disabled'}.`);
        };
        //icon for the sidebar
        const accessibilityIcon = new LabIcon({
            name: 'accessibility',
            svgstr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#154F92" d="M256 48c114.953 0 208 93.029 208 208 0 114.953-93.029 208-208 208-114.953 0-208-93.029-208-208 0-114.953 93.029-208 208-208m0-40C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 56C149.961 64 64 149.961 64 256s85.961 192 192 192 192-85.961 192-192S362.039 64 256 64zm0 44c19.882 0 36 16.118 36 36s-16.118 36-36 36-36-16.118-36-36 16.118-36 36-36zm117.741 98.023c-28.712 6.779-55.511 12.748-82.14 15.807.851 101.023 12.306 123.052 25.037 155.621 3.617 9.26-.957 19.698-10.217 23.315-9.261 3.617-19.699-.957-23.316-10.217-8.705-22.308-17.086-40.636-22.261-78.549h-9.686c-5.167 37.851-13.534 56.208-22.262 78.549-3.615 9.255-14.05 13.836-23.315 10.217-9.26-3.617-13.834-14.056-10.217-23.315 12.713-32.541 24.185-54.541 25.037-155.621-26.629-3.058-53.428-9.027-82.141-15.807-8.6-2.031-13.926-10.648-11.895-19.249s10.647-13.926 19.249-11.895c96.686 22.829 124.283 22.783 220.775 0 8.599-2.03 17.218 3.294 19.249 11.895 2.029 8.601-3.297 17.219-11.897 19.249z"/></svg>'
        });
        const altCellList = new AltCellList(notebookTracker);
        altCellList.id = 'AltCellList';
        altCellList.title.icon = accessibilityIcon;
        labShell.add(altCellList, 'right');
        labShell.activateById('AltCellList');
        notebookTracker.currentChanged.connect((sender, notebookPanel) => {
            if (!notebookPanel)
                return;
            notebookPanel.context.ready.then(() => {
                const { content } = notebookPanel;
                //for each existing cell, attach a content changed listener
                content.widgets.forEach(async (cell) => {
                    attachContentChangedListener(content, altCellList, cell, () => isEnabled, notebookTracker.currentWidget.context.path);
                });
                checkAllCells(content, altCellList, () => isEnabled, notebookTracker.currentWidget.context.path, true);
                //every time a cell is added, attach a content listener to it
                if (content.model) {
                    content.model.cells.changed.connect((sender, args) => {
                        if (args.type === 'add') {
                            args.newValues.forEach(async (cellModel) => {
                                const cell = content.widgets.find(c => c.model.id === cellModel.id);
                                if (cell) {
                                    const newCell = cell;
                                    attachContentChangedListener(content, altCellList, newCell, () => isEnabled, notebookTracker.currentWidget.context.path);
                                    await checkAllCells(content, altCellList, () => isEnabled, notebookTracker.currentWidget.context.path, true);
                                }
                            });
                        }
                    });
                }
            });
        });
        // When a new notebook is created or opened, add the toolbar button
        notebookTracker.widgetAdded.connect((sender, notebookPanel) => {
            var _a;
            // while(!document.getElementById("alt-text-check-toggle")){
            (_a = notebookTracker.currentWidget) === null || _a === void 0 ? void 0 : _a.context.ready.then(() => {
                try {
                    console.log("trying to add toolbar button");
                    console.log(notebookTracker.currentWidget);
                    addToolbarButton(labShell, altCellList, notebookPanel, () => isEnabled, toggleEnabled, notebookTracker.currentWidget.context.path);
                    console.log("able to add toolbar button");
                }
                catch (_a) {
                    console.log("trying again to add toolbar button");
                }
            });
            // } 
        });
    }
};
//html styling/logic for rendering the side bar
class AltCellList extends Widget {
    constructor(notebookTracker) {
        super();
        this._cellMap = new Map();
        this._listCells = document.createElement('div');
        this._notebookTracker = notebookTracker;
        let title = document.createElement('h2');
        title.innerHTML = "Cells with Accessibility Issues";
        title.style.margin = '15px';
        this.node.appendChild(title);
        this.node.appendChild(this._listCells);
    }
    //add a button that would navigate to the cell having the issue
    addCell(cellId, buttonContent) {
        const listItemWrapper = document.createElement('div');
        listItemWrapper.id = 'cell-' + cellId + "_" + buttonContent;
        const listItem = document.createElement('div');
        listItem.style.display = 'flex';
        listItem.style.alignItems = 'center';
        listItem.style.flexWrap = 'nowrap';
        //button
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
        //dropdown box
        const dropdown = document.createElement('div');
        dropdown.style.display = 'none';
        dropdown.style.marginLeft = '50px';
        dropdown.style.marginRight = '50px';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid black';
        dropdown.style.padding = '5px';
        const link = document.createElement('a');
        if (buttonContent.includes("Transparency")) {
            link.href = "https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html";
            link.textContent = "WCAG transparency guidelines";
        }
        else if (buttonContent.includes("Heading")) {
            link.href = "https://www.w3.org/WAI/tutorials/page-structure/headings/";
            link.textContent = "WCAG headings guidelines";
        }
        else if (buttonContent.includes("Alt")) {
            link.href = "https://www.w3.org/TR/WCAG20-TECHS/H37.html";
            link.textContent = "WCAG alt-text guidelines";
        }
        else if (buttonContent.includes("Contrast")) {
            link.href = "https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html";
            link.textContent = "WCAG text color contrast guidelines";
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
        //check if this error already exists in the running map, if so do not add it
        if (this._cellMap.has(cellId)) {
            var existingList = this._cellMap.get(cellId);
            existingList.forEach(b => {
                if (b.textContent == buttonContent) {
                    add = false;
                }
            });
            existingList.push(listItemWrapper);
            this._cellMap.set(cellId, existingList);
        }
        else {
            this._cellMap.set(cellId, [listItemWrapper]);
        }
        if (add) {
            listItem.appendChild(button);
            listItem.appendChild(infoIcon);
            listItemWrapper.appendChild(listItem);
            listItemWrapper.appendChild(dropdown);
            this._listCells.appendChild(listItemWrapper);
        }
        // this.showOnlyVisibleCells();
    }
    //remove cell from sidebar and from running map
    removeCell(cellId) {
        //get list of error buttons related to this cell
        const listItem = this._cellMap.get(cellId);
        if (listItem != null) {
            listItem.forEach((btn) => {
                for (let item of this._listCells.children) {
                    if (btn.id == item.id) {
                        this._listCells.removeChild(btn);
                    }
                }
            });
        }
        if (this._cellMap.has(cellId)) {
            this._cellMap.delete(cellId);
        }
    }
    //scroll to cell once clicked
    scrollToCell(cellId) {
        const notebookPanel = this._notebookTracker.currentWidget;
        const notebook = notebookPanel.content;
        for (let i = 0; i < notebook.widgets.length; i++) {
            const cell = notebook.widgets[i];
            if (cell.model.id === cellId) {
                cell.node.scrollIntoView({ behavior: 'auto', block: 'center' });
                //flash the cell in a yellow color briefly when higlighted
                const originalStyle = cell.node.style.transition;
                cell.node.style.transition = 'background-color 0.5s ease';
                cell.node.style.backgroundColor = '#ffff99';
                setTimeout(() => {
                    cell.node.style.backgroundColor = '';
                    cell.node.style.transition = originalStyle;
                }, 800);
            }
        }
    }
    //helper safety method that only shows issued for cells that
    // are visible ONLY in the currently opened jupyterlab notebook
    showOnlyVisibleCells() {
        console.log("showing only visible cells");
        var keyList = Array.from(this._cellMap.keys());
        const notebookPanel = this._notebookTracker.currentWidget;
        const notebook = notebookPanel.content;
        keyList.forEach(k => {
            var cellExists = false;
            for (let i = 0; i < notebook.widgets.length; i++) {
                const cell = notebook.widgets[i];
                if (cell.model.id === k) {
                    cellExists = true;
                    break;
                }
            }
            if (!cellExists) {
                this.removeCell(k);
            }
        });
    }
}
export default plugin;
//# sourceMappingURL=index.js.map