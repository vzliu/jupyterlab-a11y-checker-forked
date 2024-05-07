# jupyterlab-a11y-checker
This tool performs multiple accessibility checks on Jupyter notebook/Lab cells containing images and headings. It verifies the presence of alt-text for images, ensuring that visually impaired users can understand their content. Additionally, it calculates the color contrast ratio to ensure readability for users with low vision and identifies any transparency issues in images. Furthermore, it evaluates the heading structure to align with WCAG standards, ensuring that headers (h1, h2, etc.) are appropriately structured for optimal accessibility.

![transparency](https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/assets/2306166/b6f25067-fd8d-4ffb-b0f0-76bec74d1318)
Guideline 1.4.3 Contrast (Minimum): The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for the following: (Level AA)
Large Text: Large-scale text and images of large-scale text have a contrast ratio of at least 3:1;
Incidental: Text or images of text that are part of an inactive user interface component, that are pure decoration, that are not visible to anyone, or that are part of a picture that contains significant other visual content, have no contrast requirement.
Logotypes: Text that is part of a logo or brand name has no minimum contrast requirement.

If the color contrast ratio is not as per the guideline 1.4.3, then the extension identfies the cell where there are color contrast issues. 
![headings](https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/assets/8241358/5088ecb3-52a6-4a2d-94a8-3515f3c01a71")
Guideline 2.4 Navigable: Provide ways to help users navigate, find content, and determine where they are.
If the headings are not structured as per guideline 2.4 then the extension identifies the exact places where there are issues with the structure of the content

![alt-checker](https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/assets/8241358/c3100644-9bb7-4c87-b5c7-7aff84d3be23)
WCAG 2.0 Guideline 1.1.1: Provide text alternatives for any non-text content so that it can be changed into other forms people need, such as large print, braille, speech, symbols or simpler language.
When the a11y-cell-checker button is run, cells containing images without alt text as per guideline 1.1.1 have a dark red circle to the left side of the cell highlighting the a11y issue.
