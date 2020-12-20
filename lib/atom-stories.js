'use babel';

import AtomStoriesView from './atom-stories-view';
import { CompositeDisposable } from 'atom';

export default {

  atomStoriesView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.atomStoriesView = new AtomStoriesView(state.atomStoriesViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.atomStoriesView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'atom-stories:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.atomStoriesView.destroy();
  },

  serialize() {
    return {
      atomStoriesViewState: this.atomStoriesView.serialize()
    };
  },

  toggle() {
    console.log('AtomStories was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
