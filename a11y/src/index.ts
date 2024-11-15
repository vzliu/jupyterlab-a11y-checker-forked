import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the a11y extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'a11y:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension a11y is activated!');
  }
};

export default plugin;
