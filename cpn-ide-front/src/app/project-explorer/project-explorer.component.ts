import {Component, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
// import {NgxXml2jsonService} from 'ngx-xml2json';
import {EventService} from '../services/event.service';
import {Message} from '../common/message';
import {ProjectService} from '../services/project.service';
import {TreeComponent} from 'angular-tree-component';
import {ModelService} from '../services/model.service';
// import {TreeComponent} from 'angular-tree-component';

@Component({
  selector: 'app-project-explorer',
  templateUrl: './project-explorer.component.html',
  styleUrls: ['./project-explorer.component.scss']
})
/**
 * class ProjectExplorerComponent
 */
export class ProjectExplorerComponent implements OnInit, OnDestroy {
  @Input() message = 'Not set';
  private eventHub: any;
  newPageCount = 0;
  stateTree;
  showTable = 'not';
  lastContextMenuId;

  selectedNode;

  filterText = '';

  // topics = ['project', 'Declarations', 'Monitors', 'Options', 'Default', 'Pages', 'Standard priorities', 'Standard declarations'];

  reservedWords = ['project', 'Declarations', 'Monitors', 'Options', 'Default', 'Pages'];
  paramsTypes = ['ml', 'color', 'var', 'globref'];
  appSettingsKeys;
  appSettings;
  /**
   * JSON object, contains full CPN-model
   */
  currentProjectModel;

  // subscription: Subscription;
  modelName;
  subpages = [];
  editableNode;
  /**
   * treeComponent - component for displaying project tree
   */
  @ViewChild('tree') treeComponent: TreeComponent;

  nodes = [];

  // nodes = [
  //   {
  //     id: 1,
  //     name: 'root1',
  //     children: [
  //       { id: 2, name: 'child1' },
  //       { id: 3, name: 'child2' }
  //     ]
  //   },
  //   {
  //     id: 4,
  //     name: 'root2',
  //     children: [
  //       { id: 5, name: 'child2.1' },
  //       {
  //         id: 6,
  //         name: 'child2.2',
  //         children: [
  //           { id: 7, name: 'subsub' }
  //         ]
  //       }
  //     ]
  //   }
  // ];
  //
  options = {
    allowDrag: true,
    allowDrop: true,

    actionMapping: {
      mouse: {
        contextMenu: (model: any, node: any, event: any) => {
          this.onTreeNodeContextMenu(event, node);
        }
      }
    }
  };


  /**
   * Constructor
   * @param {NgxXml2jsonService} xml2jsonService - xml to json service provider
   */
  constructor(
    private eventService: EventService,
    // private xml2jsonService: NgxXml2jsonService,
    private projectService: ProjectService,
    private modelService: ModelService) {
  }

  ngOnInit() {
    this.appSettings =  this.projectService.getAppSettings();
    this.appSettingsKeys = Object.keys(this.appSettings);
    // Subscribe on project load event
    this.eventService.on(Message.PROJECT_FILE_OPEN, (data) => {
      this.loadProjectData(data.project);
    });
    this.eventService.on(Message.PROJECT_LOAD, (data) => {
      this.loadProjectData(data.project);
    });

    this.eventService.on(Message.MODEL_UPDATE, (data) => {
      this.updateModel(data);
    });


    this.eventService.on(Message.UPDATE_TREE, (data) => {
      const newNodeId = data.newNodeId;
      if (data.state) {
        this.stateTree = data.state;
        // this.treeComponent.treeModel.setState(data.state);
      }
      this.loadProjectData(data.project);
      this.treeComponent.treeModel.update();
      this.updateTree();

      setTimeout(() => {
        this.treeComponent.treeModel.setState(data.state);
        // const node = this.treeComponent.treeModel.getNodeById('project');

        if (newNodeId) {
          const nodeForEdit = this.treeComponent.treeModel.getNodeById(newNodeId);
          if (!data.comonBlock) this.eventService.send(Message.OPEN_DECLARATION_BLOCK, {id: this.getCurrentBlock(nodeForEdit).id});
          let expnNode = nodeForEdit;
          while (expnNode.id !== 'project') {
            expnNode.expand();
            expnNode = expnNode.parent;
          }

          this.treeComponent.treeModel.setFocusedNode(nodeForEdit);
          this.onEditNode(nodeForEdit);
        }
      }, 100);

    });


    this.eventService.on(Message.CHANGE_NAME_PAGE, (data) => {
      if (data.changedElement === 'tran') {
        const node = this.getObjects(this.nodes, 'id', data.id);
        if (node) {
          node[0].name = data.name;
          this.modelService.changePageName(data.id, data.name);
          /*const changedPage = this.currentProjectModel.workspaceElements.cpnet.page.find(page => page._id === data.id);
          if (changedPage) {
            changedPage.pageattr._name = data.name;
          }*/
        }
      }
    });

    // this.subscribeToProject();

    // this.loadTree();

    // console.log('ProjectExplorerComponent.ngOnInit()');
    // this.updateTree();
  }

  ngOnDestroy() {
    // console.log("ProjectExplorerComponent.OnDestroy()");
    // this.subscription.unsubscribe();
  }

  /**
   * Subscribe to event emitter for receiveing project event
   */
  // subscribeToProject() {
  //   this.subscription = EmitterService.getAppMessageEmitter().subscribe((data: any) => {
  //     if (data && data.id) {
  //       if (data.id === Constants.ACTION_PROJECT_OPEN_FILE) {
  //         if (data.file) {
  //           this.loadProjectFile(data.file);
  //         }
  //       }
  //       if (data.id === Constants.ACTION_PROJECT_LOAD_DATA) {
  //         console.log('TESTTTEMIT');
  //         if (data.project) {
  //           this.loadProjectData(data.project);
  //         }
  //       }
  //       if (data.id === Constants.ACTION_MODEL_UPDATE) {
  //
  //         this.updateModel(data);
  //         console.log('Get DATA FROM PAGE!!!');
  //       }
  //     }
  //   });
  // }

  getStringValueForAddingCp(node) {
    if (node) {
      switch (node.id) {
        case 'Declarations':
          return 'declaration';
          break;
        case 'Pages':
          return 'page';
          break;
        default:
          if (node.data.type === 'page') {
            return 'page';
          } else {
            return node.id;
          }

      }
    }
  }

  /**
   * icon Add click handler
   * @param node - current page node in explorer
   */
  onAddNode(node, addingElement) {
    console.log('onAddNode(), node = ', node);

    if (node.data.type === 'page' || node.data.id === 'Pages') {
      //console.log('onAddNode ' + node.data.id);
      console.log('content' + node.id + 'IsSelected ---');
      const newPage = {
        pageattr: {
          _name: this.projectService.getAppSettings()['page'] + (this.newPageCount++)
        },
        place: [],
        trans: [],
        arc: [],
        constraints: '',
        _id: 'ID' + new Date().getTime()
      };
      const pageNode = {
        // id: page['@attributes'].id,
        // name: page.pageattr['@attributes'].name,
        id: newPage._id, // page._id,
        name: newPage.pageattr._name, // page.pageattr._name,
        type: 'page',
        object: newPage, // page,
        children: []
      };
      /* if (this.projectService.projectData.project.data.workspaceElements.cpnet.page.lenght)
        this.projectService.projectData.project.data.workspaceElements.cpnet.page.push(pageNode);
      else {
        this.projectService.projectData.project.data.workspaceElements.cpnet.page = [this.projectService.projectData.project.data.workspaceElements.cpnet.page];
      } */

      // if (this.currentProjectModel.workspaceElements.cpnet.page.length) {
      //   this.currentProjectModel.workspaceElements.cpnet.page.push(newPage);
      // } else {
      //   this.currentProjectModel.workspaceElements.cpnet.page = [this.currentProjectModel.workspaceElements.cpnet.page];
      //   this.currentProjectModel.workspaceElements.cpnet.page.push(newPage);
      // }

      this.modelService.createNewPage(newPage);
      //  let page = this.getObjects(this.nodes, 'id', node.data.id)
      // page[0].children.push(pageNode);
      node.data.children.push(pageNode);
      this.updateTree();
      const editableNode = this.treeComponent.treeModel.getNodeById(pageNode.id);
      this.treeComponent.treeModel.setFocusedNode(editableNode);
      this.onEditNode(this.treeComponent.treeModel.getNodeById(pageNode.id));
      let expnNode = editableNode;
      while (expnNode && expnNode.id !== 'project') {
        expnNode.expand();
        expnNode = expnNode.parent;
      }
      // this.eventService.send(Message.XML_UPDATE, {project: {data: this.currentProjectModel, name: this.modelName}});
      if (node.data.id !== 'Pages') {
        this.eventService.send(Message.SUBPAGE_CREATE, {
          name: pageNode.name,
          id: pageNode.id,
          event: event,
          state: this.treeComponent.treeModel.getState()
        });
      }
    } else {
      if (!addingElement) {
        addingElement = node.data.id;
      }
      //this.sendChangingElementToDeclarationPanel(node, addingElement, 'add', undefined);
      this.modelService.sendChangingElementToDeclarationPanel(node, addingElement, 'add', undefined, this.getCurrentBlock(node).id, this.treeComponent.treeModel.getState());
    }

    // console.log('onAddNode(), new node = ', pageN);

  }

  /*sendChangingElementToDeclarationPanel(node, elementType, action, id) {
    if (elementType === 'Declarations' || elementType === 'block') {
      this.eventService.send(Message.CHANGE_EXPLORER_TREE, {
        node: action === 'rename' ? node : undefined,
        action: action,
        element: 'tab',
        target: this.getCurrentBlock(node).id,
        id: id,
        state: this.treeComponent.treeModel.getState()
      });
    } else if (elementType === 'ml') {
      this.eventService.send(Message.CHANGE_EXPLORER_TREE, {
        node: action === 'rename' ? node : undefined,
        action: action,
        element: elementType,
        target: this.getCurrentBlock(node).id,
        id: id,
        state: this.treeComponent.treeModel.getState()
      });
    } else if (elementType === 'color') {
      this.eventService.send(Message.CHANGE_EXPLORER_TREE, {
        node: action === 'rename' ? node : undefined,
        action: action,
        element: elementType,
        target: this.getCurrentBlock(node).id,
        id: id,
        state: this.treeComponent.treeModel.getState()
      });
    } else if (elementType === 'var') {
      this.eventService.send(Message.CHANGE_EXPLORER_TREE, {
        node: action === 'rename' ? node : undefined,
        action: action,
        element: elementType,
        target: this.getCurrentBlock(node).id,
        id: id,
        state: this.treeComponent.treeModel.getState()
      });
    } else if (elementType === 'globref') {
      this.eventService.send(Message.CHANGE_EXPLORER_TREE, {
        node: action === 'rename' ? node : undefined,
        action: action,
        element: elementType,
        target: this.getCurrentBlock(node).id,
        id: id,
        state: this.treeComponent.treeModel.getState()
      });
    } else if (this.modelService.paramsTypes.includes(id)) {
      this.eventService.send(Message.CHANGE_EXPLORER_TREE, {
        node: action === 'rename' ? node : undefined,
        action: action,
        target: this.getCurrentBlock(node).id,
        id: id,
        state: this.treeComponent.treeModel.getState()
      });
    }
  }*/


  openNode(event, node) {
    console.log('openNode(), event = ', event);
    const currentNode = this.getCurrentBlock(node);
    console.log(currentNode);
    this.eventService.send(Message.OPEN_DECLARATION_BLOCK, {id: currentNode.id});

    event.preventDefault();
  }

  getCurrentBlock(currentNode): any {
    while (currentNode.parent && currentNode.parent.data && currentNode.parent.data.id !== 'Declarations') {
      if (!this.modelService.paramsTypes.includes(currentNode.id) && !this.modelService.paramsTypes.includes(currentNode.parent.id)) {
        break;
      }
      currentNode = currentNode.parent;
    }
    return currentNode;
  }

  isDeclarationBlock(node) {
    let block;
    try {
      block = this.findBlock(node);
    } catch (exeption) {
      return false;
    }
    // console.log(block.parent.id)
    return block && block.parent && block.parent.data.id === 'Declarations';
  }

  findBlock(currentNode): any {
    while (currentNode.parent && currentNode.parent.data && currentNode.parent.data.id !== 'Declarations') {
      currentNode = currentNode.parent;
    }
    return currentNode;
  }

  /**
   * save changed name to model by pressing enter key
   * @param event
   */
  @HostListener('document:keydown', ['$event'])
  keyEvent(event: KeyboardEvent) {
    console.log('Key event TAB EVEnt' + event);
    //  this.diagram.get('eventBus').fire('element.hover', this.curentElement );
    if (event.keyCode === 13) {
      const htmlElement: HTMLInputElement = <HTMLInputElement>event.target;
      if (htmlElement && htmlElement.name === 'textinpfield') {
        this.editableNode.data.name = htmlElement.value;
        if (this.editableNode.data.object) {
          this.editableNode.data.object.pageattr._name = this.editableNode.data.name;
          this.eventService.send(Message.CHANGE_NAME_PAGE, {
            id: this.editableNode.id,
            name: this.editableNode.data.name,
            changedElement: 'page',
            parentPage: this.editableNode.parent.data.name
          });
          this.editableNode = null;
        } else {
          //this.sendChangingElementToDeclarationPanel(this.editableNode, this.editableNode.parent.data.id, 'rename', this.editableNode.data.id);
          this.modelService.sendChangingElementToDeclarationPanel(this.editableNode, this.editableNode.parent.data.id, 'rename', this.editableNode.data.id,  this.getCurrentBlock(this.editableNode).id, this.treeComponent.treeModel.getState());
        }
        //   this.eventService.send(Message.XML_UPDATE, {project: {data: this.currentProjectModel, name: this.modelName}});
      } else if (htmlElement && htmlElement.nodeName === 'TD') {
        if (htmlElement.offsetParent) {
          const htmlTableElement: HTMLTableElement = <HTMLTableElement>document.getElementById(htmlElement.offsetParent.id);

          if (htmlTableElement.id === 'application-settings-table') {
            const rows = htmlTableElement.rows.length;

            for (let i = 0; i < rows; i += 1) {
              const value = htmlTableElement.rows[i].cells[1].textContent;
              const name = htmlTableElement.rows[i].cells[0].textContent;
              this.appSettings[name] = value;
            }

          }

          this.showTable = 'application-settings-table';
          setTimeout(() => {
            this.showTable = 'not'
          }, 0);

        }

      }
    }
  }


  /*
   * Edit node text by double click on node handler or by context menu
   * @param node
   */
  onEditNode(node) {
    console.log(this.constructor.name, 'editNodeText(), node = ', node);

    if (this.canEdit(node)) {
      this.editableNode = node;
      console.log(this.constructor.name, 'editNodeText(), this.editableNode = ', this.editableNode);
      setTimeout(() => { // this will make the execution after the above boolean has changed
        const inputElem = document.getElementById('textinpfield');

       console.log(this.constructor.name, 'editNodeText(), inputElem = ', inputElem);
        console.log(this.constructor.name, 'editNodeText(), nodeElem = ', node);

        if (inputElem)
          inputElem.focus();
      }, 100);
    }
  }

  /**
   * icon delete click handler
   * @param node - current page node in explorer
   */
  onDeleteNode(node) {
    let parentNod;
    if (node.data.type === 'page' || node.data.id === 'Pages') {
      // if (this.currentProjectModel.workspaceElements.cpnet.page.length) {
      //   this.currentProjectModel.workspaceElements.cpnet.page = this.currentProjectModel.workspaceElements.cpnet.page.filter(x => x._id !== node.id);
      // } else {
      //   this.currentProjectModel.workspaceElements.cpnet.page = [];
      // }
      this.modelService.deletePage(node.id);
      parentNod = node.parent;
      // node.parent.data.children = node.parent.data.children.filter(x => x.id !== node.id);
      this.deleteNode(this.nodes[0], node.id);
      this.eventService.send(Message.DELETE_PAGE, {id: node.id, parent: node.parent.data.name});
      this.updateTree();
      this.focusedNode(parentNod);
      // this.eventService.send(Message.PAGE_OPEN, {pageObject: undefined, subPages: undefined});
    } else {
      parentNod = node.parent;
      this.focusedNode(parentNod);
      // deletingElem = !this.paramsTypes.includes(node.parent.id) ? node.data.id : node.parent.id;
      //this.sendChangingElementToDeclarationPanel(node, node.parent.id, 'delete', node.data.id);
      this.modelService.sendChangingElementToDeclarationPanel(node, node.parent.id, 'delete', node.data.id,  this.getCurrentBlock(node).id, this.treeComponent.treeModel.getState());
    }

  }


  focusedNode(node){
    if(node) {
      const newfocusedBlock = this.getCurrentBlock(node);
      this.eventService.send(Message.OPEN_DECLARATION_BLOCK, {id: newfocusedBlock.id});
      this.treeComponent.treeModel.setFocusedNode(newfocusedBlock);
      this.treeComponent.treeModel.setActiveNode(newfocusedBlock, true, false)
      this.treeComponent.treeModel.setSelectedNode(newfocusedBlock, true);
    }
  }


  /**
   * delete page node from model
   * @param node
   * @param id
   */
  deleteNode(node, id) {
    for (const nd of node.children) {
      if (nd.id === id) {
        node.children = node.children.filter(x => x !== nd);
      }
      if (nd.children && nd.children.length > 0) {
        this.deleteNode(nd, id);
      }
    }
  }

  getObjects(obj, key, val) {
    let objects = [];
    for (const i in obj) {
      if (!obj.hasOwnProperty(i)) {
        continue;
      }
      if (typeof obj[i] === 'object') {
        objects = objects.concat(this.getObjects(obj[i], key, val));
      } else if (i === key && obj[i] === val || i === key && val === '') { //
        objects.push(obj);
      } else if (obj[i] === val && key === '') {
        if (objects.lastIndexOf(obj) === -1) {
          objects.push(obj);
        }
      }
    }
    return objects;
  }


  updateModel(updatedData) {
    this.modelService.updateModel(updatedData);
   /* const project = this.currentProjectModel;
    if (project.workspaceElements.cpnet.page.length) {
      for (let page of project.workspaceElements.cpnet.page) {
        if (page.pageattr._name === updatedData.pageObject.pageattr._name) {
          page = updatedData.pageObject;

          // EmitterService.getAppMessageEmitter().emit({
          //   id: Constants.ACTION_XML_UPDATE, // id: Constants.ACTION_PROJECT_LOAD_DATA,
          //   project: {data: project, name: this.modelName}
          // });

          this.eventService.send(Message.XML_UPDATE, {project: {data: project, name: this.modelName}});
        }
      }
    } else {
      let page = project.workspaceElements.cpnet.page;
      if (page.pageattr._name === updatedData.pageObject.pageattr._name) {
        page = updatedData.pageObject;

        // EmitterService.getAppMessageEmitter().emit({
        //   id: Constants.ACTION_XML_UPDATE, // id: Constants.ACTION_PROJECT_LOAD_DATA,
        //   project: {data: project, name: this.modelName}
        // });

        this.eventService.send(Message.XML_UPDATE, {project: {data: project, name: this.modelName}});
      }
    }
    //  console.log('Get data fromPAge ----' + JSON.stringify(updatedData.pageObject));
    // console.log('actual data -------' + JSON.stringify(proj.workspaceElements.cpnet.page));*/
  }

  // loadTree() {
  //   const headers = new HttpHeaders()
  //     .set('Access-Control-Allow-Origin', '*')
  //     .set('Accept', 'application/xml');
  //
  //   // const modelFile = 'baseModel_ID1008016.cpn';
  //   // const modelFile = 'discretemodel_task1.cpn';
  //   // const modelFile = 'erdp.cpn';
  //   // const modelFile = 'hoponhopoff-color.cpn';
  //   const modelFile = 'mynet.cpn';
  //   // const modelFile = 'mscProtocol.cpn'
  //   const url = './assets/cpn/' + modelFile;
  //   this.http.get(url, {headers: headers, responseType: 'text'})
  //     .subscribe(
  //       (response: any) => {
  //         // console.log('GET ' + url + ', response = ' + JSON.stringify(response));
  //         this.loadProjectXml(modelFile, response);
  //       },
  //       (error) => {
  //         console.error('GET ' + url + ', error = ' + JSON.stringify(error));
  //       }
  //     );
  // }

  // loadProjectFile(file: File) {
  //   const reader: FileReader = new FileReader();
  //   reader.readAsText(file);
  //   reader.onload = e => {
  //     const text: any = reader.result;
  //     // console.log('File text : ' + text);
  //
  //     this.loadProjectXml(file.name, text);
  //   };
  // }

  // loadProjectXml(filename: string, projectXml: string) {
  //   const parser = new DOMParser();
  //   this.modelName = filename;
  //   const xml = parser.parseFromString(projectXml, 'text/xml');
  //
  //   if (!xml) {
  //     return;
  //   }
  //
  //   // let X2JS = require('x2js');
  //   const x2js = new X2JS();
  //   const json = x2js.xml_str2json(projectXml);
  //   // var document = x2js.xml2js(xml);
  //   //   const json: any = this.xml2jsonService.xmlToJson(xml);
  //   //  json: any = xml2json(xml, "");
  //
  //   console.log('First convert-----' + JSON.stringify(json));
  //   if (!json) {
  //     return;
  //   }
  //
  //
  //   EmitterService.getAppMessageEmitter().emit({
  //     id: Constants.ACTION_PROJECT_LOAD_DATA,
  //     project: {data: json, name: filename}
  //   });
  // }


  buildGlobboxTree(block, projectNode) {
    let paramNode;
    paramNode = {
      id: block.id,
      name: block.id,
      children: []
    };

    projectNode.children.push(paramNode);
    if (block.ml) {
      const mlNode = {
        id: 'ml',
        name: 'ml',
        children: []
      };
      paramNode.children.push(mlNode);
      let mlstr: string;
      if (block.ml instanceof Array) {
        for (const ml of block.ml) {
          mlstr = ml.toString();
          mlNode.children.push({
            id: ml._id,
            // id: globref['@attributes'].id,
            name: ml
          });
        }
      } else {
        mlNode.children.push({
          id: block.ml._id,
          // id: globref['@attributes'].id,
          name: block.ml
        });
      }
    }
    if (block.var) {
      const varNode = {
        id: 'var',
        name: 'var',
        children: []
      };
      paramNode.children.push(varNode);
      if (block.var instanceof Array) {
        for (const v of block.var) {
          const node = {
            // id: v['@attributes'].id,
            id: v._id,
            name: v.id,
          };
          if (v.layout) {
            // node.name += ' : ' + v.layout;
            node.name = v.layout.replace('var ', '');
          } else {
            node.name = v.id + ' : ' + v.type.id + ';';
          }
          varNode.children.push(node);
        }
      } else {
        const node = {
          // id: v['@attributes'].id,
          id: block.var._id,
          name: block.var.id,
        };

        if (block.var.layout) {
          //  node.name += ' : ' + block.var.layout;
          node.name = block.var.layout.replace('var ', '');
        } else {
          node.name = block.var.id + ': ' + block.var.type.id + ';';
        }

        varNode.children.push(node);
      }

    }
    if (block.globref) {
      const globrefNode = {
        id: 'globref',
        name: 'globref',
        children: []
      };
      paramNode.children.push(globrefNode);
      if (block.globref instanceof Array) {
        for (const globref of block.globref) {
          globrefNode.children.push({
            // id: globref['@attributes'].id,
            id: globref._id,
            name: globref.layout ? globref.layout.replace('globref ', '') : globref.id + ' = ' + globref.ml + ';',
          });
        }
      } else {
        globrefNode.children.push({
          // id: globref['@attributes'].id,
          id: block.globref._id,
          name: block.globref.layout ? block.globref.layout.replace('globref ', '') : block.globref.id + ' = ' + block.globref.ml + ';',
        });
      }
    }
    if (block.color) {
      const colorNode = {
        id: 'color',
        name: 'color',
        children: []
      };
      paramNode.children.push(colorNode);
      if (block.color instanceof Array) {
        for (const color of block.color) {
          const node = {
            // id: color['@attributes'].id,
            id: color._id,
            name: color.id,
          };
          if (color.layout) {
            node.name = color.layout.replace('colset ', '').replace('color ', '');
          } else {
            if (color.alias && color.alias.id) {
              node.name += ' = ' + color.alias.id;
            } else if (color.list && color.list.id) {
              node.name += ' = list ' + color.list.id;
            } else if (color.product && color.product.id) {
              node.name += ' = product ';
              if (color.product.id instanceof Array) {
                for (let i = 0; i < color.product.id.length; i++) {
                  node.name += i === 0 ? color.product.id[i] + ' ' : '* ' + color.product.id[i];
                }
              } else {
                node.name += color.product.id;
              }
            } else {
              node.name += ' = ' + color.id.toLowerCase();
            }
            if ('timed' in color) {
              node.name += ' timed';
            }
          }
          colorNode.children.push(node);
        }
      } else {
        const node = {
          // id: color['@attributes'].id,
          id: block.color._id,
          name: block.color.id,
        };
        if (block.color.layout) {
          node.name = block.color.layout.replace('colset ', '').replace('color ', '');
        } else {
          if (block.color.alias && block.color.alias.id) {
            node.name += ' = ' + block.color.alias.id;
          } else if (block.color.list && block.color.list.id) {
            node.name += ' = list ' + block.color.list.id;
          } else if (block.color.product && block.color.product.id) {
            node.name += ' = product ';
            if (block.color.product.id instanceof Array) {
              for (let i = 0; i < block.color.product.id.length; i++) {
                node.name += i === 0 ? block.color.product.id[i] + ' ' : '* ' + block.color.product.id[i];
              }
            } else {
              node.name += block.color.product.id;
            }
          } else {
            node.name += ' = ' + block.color.id.toLowerCase();
          }
          if ('timed' in block.color) {
            node.name += ' timed';
          }
        }
        colorNode.children.push(node);
      }
    }
    if (block.block) {
      for (const inblock of block.block) {
        this.buildGlobboxTree(inblock, paramNode);
      }
      if (block.block.id) {
        this.buildGlobboxTree(block.block, paramNode);
      }
    }
  }


  loadProjectData(project: any) {
    this.filterText = '';

    const projectData = project.data;
    const projectName = project.name;
    this.currentProjectModel = project.data;

    console.log('loadProjectData(project: any), project = ', project);

    this.nodes = [];
    this.treeComponent.treeModel.collapseAll();
    this.updateTree();

    const projectNode = {
      id: 'project',
      name: 'Project: ' + project.name,
      classes: ['tree-project'],
      children: []
    };
    this.nodes.push(projectNode);
    const OptionsNode = {
      id: 'Options',
      name: 'Options',
      children: []
    };
    projectNode.children.push(OptionsNode);
    let cpnet;

    if (projectData.workspaceElements) {
      if (projectData.workspaceElements instanceof Array) {
        for (const workspaceElement of projectData.workspaceElements) {
          if (workspaceElement.cpnet) {
            cpnet = workspaceElement.cpnet;
            break;
          }
        }
      } else {
        if (projectData.workspaceElements.cpnet) {
          cpnet = projectData.workspaceElements.cpnet;
        }
      }
    }

    if (cpnet) {
      if (cpnet.globbox) {
        if (cpnet.globbox.block) {
          const DeclarationsNode = {
            id: 'Declarations',
            name: 'Declarations',
            children: []
          };
          projectNode.children.push(DeclarationsNode);
          // GlobBox
          // --------------------------------------
          for (const block of cpnet.globbox.block) {
            this.buildGlobboxTree(block, DeclarationsNode);
          }
          if (cpnet.globbox.block.id) {
            this.buildGlobboxTree(cpnet.globbox.block, DeclarationsNode);
          }
          // this.buildGlobboxTree(cpnet.globbox, DeclarationsNode);
          // this.buildGlobboxTree(cpnet.globbox.block, projectNode);
          // Pages
          // --------------------------------------
          if (cpnet.page) {
            const pagesNode = {
              id: 'Pages',
              name: 'Pages',
              children: []
            };
            projectNode.children.push(pagesNode);
            console.log('cpnet page count: ' + cpnet.page.length);
            if (!cpnet.page.length) {
              this.setPage(cpnet.page, pagesNode, cpnet, false);
            } else {
              for (const page of cpnet.page) {
                if (page.trans && page.trans.length) {
                  for (const tran of page.trans) {
                    if (tran.subst) {
                      this.subpages.push({subpageid: tran.subst._subpage, tranid: tran._id});
                      // this.subpages.push(tran._id);
                    }
                  }
                } else {
                  if (page.trans && page.trans.subst) {
                    this.subpages.push({subpageid: page.trans.subst._subpage, tranid: page.trans._id});
                    // this.subpages.push(page.trans._id);
                  }
                }
              }
              for (const page of cpnet.page) {
                this.setPage(page, pagesNode, cpnet, false);
              }
            }
          }
          // -------------------------------
          const MonitorNode = {
            id: 'Monitors',
            name: 'Monitors',
            children: []
          };
          projectNode.children.push(MonitorNode);
        }
      }
    }

    if (!this.stateTree) {
      this.updateTree();
      setTimeout(() => {
        const node = this.treeComponent.treeModel.getNodeById('project');
        if (node) {
          node.expand();
        }
      }, 100);
    }

  }


  setPage(page: any, pagesNode: any, cpnet: any, isTransit: boolean) {
    // Page
    if (page.pageattr && (!this.subpages.find(e => e.subpageid === page._id || e.tranid === page._id) || isTransit)) {
      const pageNode = {
        // id: page['@attributes'].id,
        // name: page.pageattr['@attributes'].name,
        id: page._id,
        name: page.pageattr._name,
        type: 'page',
        object: page,
        children: []
      };

      pagesNode.children.push(pageNode);

      // Places
      if (page.place) {
        const placesNode = {
          id: 'Places.' + pageNode.id,
          name: 'Places',
          children: []
        };
        //  pageNode.children.push(placesNode);

        for (const place of page.place) {
          const node = {
            // id: place['@attributes'].id,
            id: place._id,
            name: place.text,
            object: place
          };

          //  placesNode.children.push(node);
        }
      }
      // ---------------------------------------


      // Transitions
      if (page.trans) {
        const transitionNode = {
          id: 'Transitions.' + pageNode.id,
          name: 'Transitions',
          children: []
        };
        // pageNode.children.push(transitionNode);
        if (page.trans.length) {
          for (const trans of page.trans) {
            const node = {
              // id: place['@attributes'].id,
              id: trans._id,
              name: trans.text,
              object: trans
            };
            if (trans.subst) {
              for (const subpage of  cpnet.page) {
                if (subpage._id === trans.subst._subpage) {
                  this.setPage(subpage, pageNode, cpnet, true);
                }
              }
            } else {
              //  transitionNode.children.push(node);
            }
          }
        } else {
          if (page.trans.subst) {
            for (const subpage of cpnet.page) {
              if (subpage._id === page.trans.subst._subpage) {
                this.setPage(subpage, pageNode, cpnet, true);
              }
            }
          } else {
            /*transitionNode.children.push({
              // id: place['@attributes'].id,
              id: page.trans._id,
              name: page.trans.text,
              object: page.trans
            });*/
          }
        }
      }

      // Arcs
      if (page.arc) {
        const arcNode = {
          id: 'Arcs.' + pageNode.id,
          name: 'Arcs',
          children: []
        };
        // pageNode.children.push(arcNode);
        if (page.arc.length) {
          for (const arc of page.arc) {
            const node = {
              // id: place['@attributes'].id,
              id: arc._id,
              name: arc.text ? arc.text : arc.annot.text + '(' + arc._id + ')',
              object: arc
            };
            // arcNode.children.push(node);
          }
        } else {
          /*arcNode.children.push({
            // id: place['@attributes'].id,
            id: page.arc._id,
            name: page.arc.text ? page.arc.text : page.arc.annot.text + '(' + page.arc._id + ')',
            object: page.arc
          });*/
        }
      }

    }
  }

  downloadFile(data: string) {
    const blob = new Blob([data], {type: 'text/json'});
    const url = window.URL.createObjectURL(blob);
    window.open(url);
  }

  updateTree() {
    // console.log('updateTree()');
    this.treeComponent.treeModel.update();
  }


  addNode(tree: any) {
    this.nodes[0].children.push({
      id: 7, name: 'a new child'
    });
    // tree.treeModel.update();
    this.updateTree();
  }

  activateNode(event) {
    this.selectedNode = event.node;

   // if (event.node !== this.editableNode) {
  //    this.editableNode = null;
  //  }
    // console.log(event);
    // console.log(event.node);

    if (event && event.node && event.node.data && event.node.data.type === 'page') {
      const pageObject = event.node.data.object;
      // console.log('activateNode(), pageObject = ' + JSON.stringify(pageObject));

      // EmitterService.getAppMessageEmitter().emit(
      //   {
      //     id: Constants.ACTION_PAGE_OPEN,
      //     pageObject: pageObject,
      //     subPages: this.subpages
      //   });

      this.eventService.send(Message.PAGE_OPEN, {pageObject: pageObject, subPages: this.subpages});
    }
  }

  hideContextMenu() {
    if (this.lastContextMenuId) {
      $(this.lastContextMenuId).removeClass('show').hide();
    }
  }

  onTreeNodeContextMenu(event, node) {

    this.hideContextMenu();

    const contextMenuId = '#context-menu-' + node.id.replace(' ', '-').toLowerCase();

    console.log('onTreeNodeContextMenu, node = ', node);

    const top = event.pageY;
    const left = event.pageX;
    $(contextMenuId).css({
      display: 'block',
      top: top,
      left: left
    }).addClass('show');

    this.lastContextMenuId = contextMenuId;

    event.preventDefault();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event) {
    console.log(this.constructor.name, 'onDocumentClick(), event = ', event);

    this.hideContextMenu();

    // if (event.target.id !== 'textinpfield')
    //   this.editableNode = undefined;
  }

  closeNodeEditor(event) {
    console.log(this.constructor.name, 'closeNodeEditor(), event = ', event);

    this.editableNode = undefined;
  }


  canCreate(node): boolean {
    return node && ((node.id === 'Pages' || node.data.type === 'page' || node.id === 'Declarations')
      || (!this.modelService.paramsTypes.includes(node.parent.data.id) && (this.modelService.paramsTypes.includes(node.id))));
  }

  canEdit(node): boolean {
    return node && !this.reservedWords.includes(node.data.id) && !this.modelService.paramsTypes.includes(node.data.id);
  }

  canDelete(node): boolean {
    return node && !this.reservedWords.includes(node.data.id) && !this.modelService.paramsTypes.includes(node.data.id);
  }

  canCreateDeclaration(node): boolean {
    return (this.isDeclarationBlock(node)
      && !this.modelService.paramsTypes.includes(node.data.id)
      && !this.modelService.paramsTypes.includes(node.parent.data.id));
  }

  autoWidth(event) {
    console.log(this.constructor.name, 'autoWidth(), event.srcElement = ', event.srcElement);

    let w = ((event.srcElement.value.length + 1) * 7);
    if (w < 30)
      w = 30;

    event.srcElement.style.width = w + 'px';
  }

  changeFilter(filterText) {
    // console.log(this.constructor.name, 'changeFilter(), filterText = ', filterText);

    this.filterText = filterText;
    // this.treeComponent.treeModel.filterNodes(this.filterText, true);

    if (this.filterText !== '') {
      this.treeComponent.treeModel.filterNodes((node) => {
        // console.log(this.constructor.name, 'this.treeComponent.treeModel.filterNodes, node = ', node);
        return node.data.name.toString().toLowerCase().includes(this.filterText.toLowerCase());
      });
    } else {
      this.treeComponent.treeModel.clearFilter();
    }
  }

}

