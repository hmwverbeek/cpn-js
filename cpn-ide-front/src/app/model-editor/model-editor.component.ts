import { Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';

import { assign } from 'min-dash';
import Diagram from 'diagram-js';
import CpnDiagramModule from '../../lib/cpn-js/core';

import { EmitterService } from '../services/emitter.service';
import { HttpClient } from '@angular/common/http';
import { Message } from '../common/message';
import { EventService } from '../services/event.service';
import { ModelService } from '../services/model.service';

import { importCpnPage } from '../../lib/cpn-js/import/Importer';
import { element } from 'protractor';
import {
  CPN_LABEL,
  CPN_TOKEN_LABEL,
  CPN_MARKING_LABEL,
  isCpn,
  is,
  CPN_PLACE,
  CPN_TRANSITION,
  CPN_CONNECTION,
  isAny,
} from '../../lib/cpn-js/util/ModelUtil';


@Component({
  selector: 'app-model-editor',
  templateUrl: './model-editor.component.html',
  styleUrls: ['./model-editor.component.scss']
})
export class ModelEditorComponent implements OnInit {

  constructor(private eventService: EventService,
    private emitterService: EmitterService,
    private http: HttpClient,
    private modelService: ModelService) {
  }

  @ViewChild('container') containerElementRef: ElementRef;
  @Input() id: string;


  diagram: Diagram;
  elementFactory;
  cpnFactory;
  canvas;
  dragging;
  modeling;
  labelEditingProvider;
  textRenderer;
  selectedElement;
  jsonPageObject;
  // subscription: Subscription;
  subpages = [];
  placeShapes = [];
  transShapes = [];
  arcShapes = [];
  curentElement;
  pageId;
  transCount = 0;

  loading = false;

  correctColor = {
    'Fucia': '#f0f'
  };

  ngOnInit() {
    this.subscripeToAppMessage();


    // this.diagram = new Diagram({
    //   container: this.containerElementRef.nativeElement
    // });

    this.diagram = new Diagram({
      canvas: {
        container: this.containerElementRef.nativeElement
      },
      modules: [
        CpnDiagramModule,
      ]
    });

    const eventBus = this.diagram.get('eventBus');

    this.elementFactory = this.diagram.get('elementFactory');
    this.dragging = this.diagram.get('dragging');
    this.canvas = this.diagram.get('canvas');
    this.modeling = this.diagram.get('modeling');
    this.labelEditingProvider = this.diagram.get('labelEditingProvider');
    this.textRenderer = this.diagram.get('textRenderer');
    this.cpnFactory = this.diagram.get('cpnFactory')


    // set defualt values to diagram
    // -----------------------------------------------------
    this.modeling.setDefaultValue('type', 'UINT');
    this.modeling.setDefaultValue('initmark', 'INIT MARK');

    this.modeling.setDefaultValue('cond', '[]');
    this.modeling.setDefaultValue('time', '@+');
    this.modeling.setDefaultValue('code', 'input();\noutput();\naction();\n');
    this.modeling.setDefaultValue('priority', 'P_NORMAL');
    this.modeling.setDefaultValue('annot', 'expr');
    this.modeling.setDefaultValue('ellipse', { h: 40, w: 70 });
    this.modeling.setDefaultValue('box', { h: 40, w: 70 });


    eventBus.on('import.render.complete', (event) => {
      this.loading = false;

      const pageElement = event.source;

      console.log('import.render.complete, event = ', event);

      this.eventService.send(Message.MODEL_UPDATE, { pageObject: pageElement });

      // set status 'clear' for all shapes on diagram
      this.modeling.setCpnStatus({ clear: '*' });

      // set status 'process' for all shapes on diagram
      this.modeling.setCpnStatus({ process: '*' });
    });

    this.eventService.on(Message.VERIFICATION_DONE, () => {
      // set status 'clear' for all shapes on diagram
      this.modeling.setCpnStatus({ clear: '*' });
      // TODO: temporary set error and ready status for test shapes. Should be changed to real id
      // this.modeling.setCpnStatus({ error: ['ID1412328424','ID1412328605'], ready: ['ID1412328496'] });

      this.emitterService.getMarking(undefined).subscribe(
        (data: any) => {
          console.log('this.emitterService.getMarking(), data = ', data);

          eventBus.fire('model.update.tokens', { data: data });
        });

      this.emitterService.getEnableTransitions('ID0000001').subscribe(
        (data: any) => {
          console.log('this.emitterService.getEnableTransitions(), data = ', data);

          this.modeling.setCpnStatus({ ready: data });
        });
    });


    eventBus.on('element.hover', (event) => {
      if (event.element.type === 'cpn:Transition' || event.element.type === 'cpn:Place') {
        this.eventService.send(Message.SHAPE_HOVER, { element: event.element });
      }
    });
    eventBus.on('element.out', (event) => {
      if (event.element.type === 'cpn:Transition' || event.element.type === 'cpn:Place') {
        this.eventService.send(Message.SHAPE_OUT, { element: event.element });
      }
    });
    let self = this;
    eventBus.on('directEditing.cancel', function (e) {
      console.log('model-editor directEditing.cancel - event', e);
      self.openPropPanel(e.active.element);
      self.selectedElement = undefined;
    });

    eventBus.on('directEditing.complete', function (e) {
      console.log('model-editor directEditing.complete - event', e);
      if (e.active && e.active.element) {
        self.openPropPanel(e.active.element);
      }
    });

    eventBus.on('element.click', (event) => {
      this.fireSelectionEvent(event);
    });

    eventBus.on('shape.create.end', (event) => {
      if (event.elements) {
        for(let element of event.elements) {
          if(element.cpnElement)
            this.modelService.addElementJsonOnPage(element.cpnElement, this.pageId, element.type);
        }
      }
    });
  }

  subscripeToAppMessage() {

    this.eventService.on(Message.SUBPAGE_CREATE, (data) => {

      if (data.parentid === this.pageId) {
        const bounds = this.canvas.viewbox();
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height / 2;

        let position = { x: x, y: y };
        let cpnElement = this.modeling.createElementInModel(position, CPN_TRANSITION);
        cpnElement = this.modeling.declareSubPage(cpnElement, data.name, data.id);
        let element = this.cpnFactory.createShape(undefined, cpnElement, CPN_TRANSITION, position, true);

      }

    });

    // Subscribe on property update event
    this.eventService.on(Message.PROPERTY_UPDATE, (data) => {

      console.log('PROPERTY_UPDATE, data = ', data);

      const element = this.modeling.getElementByCpnElement(data.cpnElement);
      console.log('PROPERTY_UPDATE, element = ', element);

      this.modeling.updateElement(element);
      this.modeling.updateElementBounds(element);
      // this.selectedElement = element;

      this.modelUpdate();
      // this.openPropPanel(element);
    });

    this.eventService.on(Message.MODEL_ERROR, (data) => {
      if (data) {
        this.modeling.clearErrorMarking();

        for (const id of data.id) {
          const cpnElementId = id.trim().slice(0, -1);

          // set status 'clear' for all shapes on diagram
          // this.modeling.setCpnStatus({ clear: '*' });

          this.modeling.setCpnStatus({ error: [cpnElementId] });
        }
      }
    });
  }

  openPropPanel(element) {
    if (element) {
      if (element.type === CPN_LABEL) {
        element = element.labelTarget || element;
      }
      if (element.labels) {
        let labels = [];
        for (let lab of element.labels) {
          labels[lab.labelType] = lab.cpnElement;
        }

        this.eventService.send(Message.SHAPE_SELECT, { element: element, labels: labels, cpnElement: element.cpnElement, type: element.type });
      }
    }
  }

  modelUpdate() {
    const page = this.jsonPageObject;

    // set status 'process' for all shapes on diagram
    this.modeling.setCpnStatus({ process: '*' });

    this.eventService.send(Message.MODEL_UPDATE, { pageObject: page });
  }

  changeSubPageName(subpage) {
    this.eventService.send(Message.CHANGE_NAME_PAGE, { id: subpage.subpageid, name: subpage.name, changedElement: 'tran' });
  }

  /**
   * open elemen property panel after klick on it
   * @param event
   */
  fireSelectionEvent(event) {
    this.curentElement = event.element;
    //  console.log('fireSelectionEvent(), event = ', event);
    if (event.element) {
      this.openPropPanel(event.element);
    }
  }

  log(text) {
    console.log('ModelEditorComponent. log(), text = ' + text);
  }

  load(pageObject, subPages) {
    this.loading = true;

    this.subpages = subPages;
    this.jsonPageObject = pageObject;
    this.pageId = pageObject._id;
    const that = this;
    if (pageObject) {
      // this.diagram.createDiagram(function () {
      setTimeout(() => {
        that.loadPageDiagram(pageObject);
      },
        100);
      // });
    } else {
      this.canvas._clear();
    }
  }

  loadPageDiagram(pageObject) {
    console.log('loadPageDiagram(), import, pageObject = ', pageObject);

    importCpnPage(this.diagram, pageObject);
  }

  makeid(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  }

}
