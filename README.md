# jupyterlab-a11y-checker
This tool performs multiple accessibility checks on Jupyter notebook/Lab cells containing images and headings. It verifies the presence of alt-text for images, ensuring that visually impaired users can understand their content. Additionally, it calculates the color contrast ratio to ensure readability for users with low vision and identifies any transparency issues in images. Furthermore, it evaluates the heading structure to align with WCAG standards, ensuring that headers (h1, h2, etc.) are appropriately structured for optimal accessibility.

## Check for the presence of alt-text in cells containing images
WCAG 2.0/2.1 Guideline 1.1.1: Provide text alternatives for any non-text content so that it can be changed into other forms people need, such as large print, braille, speech, symbols or simpler language.

![alt-checker](https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/assets/8241358/c3100644-9bb7-4c87-b5c7-7aff84d3be23)
Upon activating the a11y-cell-checker button, any cells that contain images lacking alt text, in accordance with guideline 1.1.1, are distinctly marked with a dark red circle on the left. This visual indicator underscores the accessibility (a11y) issue that needs to be addressed.

## Check for the header structure in jupyter notebooks
WCAG 2.0/2.1 Guideline 2.4: Provide ways to help users navigate, find content, and determine where they are.

![headings](https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/assets/8241358/5088ecb3-52a6-4a2d-94a8-3515f3c01a71")
Should the headings fail to adhere to the structure outlined in guideline 2.4, the extension precisely pinpoints the locations where the content structure is flawed.

## Check for color contrast and transparency issues in images
WCAG 2.0/2.1 Guideline 1.4.3: The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for the following: (Level AA)
Large Text: Large-scale text and images of large-scale text have a contrast ratio of at least 3:1;, Incidental: Text or images of text that are part of an inactive user interface component, that are pure decoration, that are not visible to anyone, or that are part of a picture that contains significant other visual content, have no contrast requirement, Logotypes: Text that is part of a logo or brand name has no minimum contrast requirement.

![transparency](https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/assets/2306166/b6f25067-fd8d-4ffb-b0f0-76bec74d1318)
Should the color contrast ratio deviate from the standards set in guideline 1.4.3, the extension promptly identifies the specific cell exhibiting color contrast and transparency discrepancies.
