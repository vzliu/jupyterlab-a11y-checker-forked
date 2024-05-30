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

![transparency](https://github.com/berkeley-dsep-infra/jupyterlab-a11y-checker/assets/2306166/b6f25067-fd8d-4ffb-b0f0-76bec74d1318)
Should the color contrast ratio deviate from the standards set in guideline 1.4.3, the extension promptly identifies the specific cell exhibiting color contrast and transparency discrepancies.

WCAG 2.0/2.1 Guideline 1.4.3: The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for the following: (Level AA)
Large Text: Large-scale text and images of large-scale text have a contrast ratio of at least 3:1;, Incidental: Text or images of text that are part of an inactive user interface component, that are pure decoration, that are not visible to anyone, or that are part of a picture that contains significant other visual content, have no contrast requirement, Logotypes: Text that is part of a logo or brand name has no minimum contrast requirement.

# jupyterlab_a11y_checker (Extension is not yet published in npm)

[![Github Actions Status](https://github.com/github_username/jupyterlab-a11y-checker/workflows/Build/badge.svg)](https://github.com/github_username/jupyterlab-a11y-checker/actions/workflows/build.yml)[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/github_username/jupyterlab-a11y-checker/main?urlpath=lab)
A JupyterLab extension.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install jupyterlab_a11y_checker
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab_a11y_checker
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab_a11y_checker directory
# Install package in development mode
pip install -e "."
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall jupyterlab_a11y_checker
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-a11y-checker` within that folder.

### Packaging the extension

See [RELEASE](RELEASE.md)
