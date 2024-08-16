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

## How to use the extension

For step by step approach to use the extension, see the [following snapshots](https://scribehow.com/shared/Using_A11Y_Checker_for_Accessibility_Compliance__VBJ2gzstRb-dY9dKhzcFiw
)

## Pypi link for downloading and installing the extension

https://pypi.org/project/jupyterlab-a11y-checker/

# jupyterlab_a11y_checker 

A JupyterLab extension.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install jupyterlab_a11y_checker
```
## Contributing

### Build from Scratch

```bash
# Create an environment using anaconda navigator: <env-name>

conda activate <env-name>
pip install cookie cutter
python -m pip install jupyterlab notebook --pre
mamba install -c conda-forge nodejs=18
node -v #to check version

# <pull code>
OR
cookiecutter https://github.com/jupyterlab/extension-cookiecutter-ts --checkout 4.0

jlpm
jlpm run build
jupyter labextension develop . --overwrite
python -m pip install -e .
pip list #to verify it has been installed in editable mode
jupyter labextension list #to verify it has been installed

jupyter lab --no-browser #run a jupyterlab server

#Run jlpm run build, then jupyter lab --no-browser to test your code after each change
```

### Build from Temp Distribution

```bash
jlpm build:prod
npm pack #creates a tarball (*.tgz file) containing your project as it would be uploaded to the npm registry. This file can be shared and installed locally.
jupyter labextension install </path/to/your-package.tgz>


# ALTERNATIOVELY IF GIVEN A tar.gz file:

conda activate <env-name>
jupyter labextension install </path/to/your-package.tgz>
jupyter lab #this will open a local server of jupyterlab with all current extensions installed.
```

### Pip Distribution
```bash
pip install twine

# create a ~/.pypirc file at root and add this to it:
[distutils]
index-servers =
	pypi

[pypi]
repository: https://upload.pypi.org/legacy/
username: __token__
password: your-api-token

#run this command and publish to pip.
twine upload your-package.whl
```

### Development uninstall

```bash
pip uninstall jupyterlab_a11y_checker
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-a11y-checker` within that folder.
