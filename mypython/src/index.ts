import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the mya11y extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'mya11y:plugin',
  description: 'A JupyterLab extension',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension mya11y is activated!');
  }
};

export default plugin;
