import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyter a11y extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter a11y extension:plugin',
  description: 'accessibility extension for jupyter',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyter a11y extension is activated!');
  }
};

export default plugin;
