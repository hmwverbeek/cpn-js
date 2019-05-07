/**
 * Import the cpnPageElement into a diagram.
 *
 * Errors and warnings are reported through the specified callback.
 *
 * @param  {Diagram} diagram
 * @param  {Object} cpnPageElement
 * @param  {Function} done the callback, invoked with (err, [ warning ]) once the import is done
 */
import { CPN_CONNECTION, CPN_PLACE, CPN_TEXT_ANNOTATION, CPN_TRANSITION, is } from "../util/ModelUtil";

export function importCpnPage(diagram, cpnPageElement) {

  console.log('Importer.importCpnPage(), cpnPageElement = ', cpnPageElement);

  var importer, eventBus, translate, canvas, elementRegistry, layouter;

  var error, warnings = [];

  try {
    importer = diagram.get('cpnImporter');
    eventBus = diagram.get('eventBus');
    translate = diagram.get('translate');
    canvas = diagram.get('canvas');
    elementRegistry = diagram.get('elementRegistry');
    layouter = diagram.get('layouter');

    eventBus.fire('import.render.start', { source: cpnPageElement });

    // load and render CPN page element
    render(cpnPageElement);

    // calculate diagram viewbox
    const vb = getViewbox();
    if (vb) {
      canvas.viewbox(vb);
      canvas.zoom(0.7);
    }

    eventBus.fire('import.render.complete', { source: cpnPageElement, error: error, warnings: warnings });
  } catch (e) {
    console.error('ERROR rendering CPN page diagram, e = ', e);
    error = e;
  }

  /**
   * Walk the diagram semantically, importing (=drawing) all elements you encounter.
   *
   * @param {Object} cpnPageElement
   */
  function render(cpnPageElement) {

    console.log('Importer.render(), cpnElement = ', cpnPageElement);

    diagram.clear();

    if (!cpnPageElement)
      throw new Error(translate('CPN page element is undefined'));

    if (!cpnPageElement.pageattr)
      throw new Error(translate('CPN page element is not a CPN page object (pageattr is undefined)'));

    importContent(cpnPageElement, cpnPageElement.place, CPN_PLACE);
    importContent(cpnPageElement, cpnPageElement.trans, CPN_TRANSITION);
    importContent(cpnPageElement, cpnPageElement.arc, CPN_CONNECTION);
    importContent(cpnPageElement, cpnPageElement.Aux, CPN_TEXT_ANNOTATION);

    layoutConnections();
  }

  function importContent(page, element, type) {
    if (element && type) {
      if (element.length && element.length > 0) {
        for (const obj of element) {
          importer.add(page, obj, type);
        }
      } else {
        importer.add(page, element, type);
      }
    }
  }

  function layoutConnections() {
    for (const key of Object.keys(elementRegistry._elements)) {
      const element = elementRegistry._elements[key].element;

      if (is(element, CPN_CONNECTION)) {
        console.log('importCpnPage(), layoutConnections(), element = ', element);
        layouter.cropConnection(element);
      }
    }
  }


  /**
   * Calculate new diagram viewbox by loaded shapes
   */
  function getViewbox() {
    // console.log('importCpnPage(), canvas._elementRegistry._elements = ', canvas._elementRegistry._elements);
    // const viewbox = canvas.viewbox();
    // console.log('importCpnPage(), viewbox = ', viewbox);

    if (!canvas._elementRegistry._elements) {
      return undefined;
    }

    const vb = {
      x: 100000,
      y: 100000,
      width: 0,
      height: 0
    };

    for (const key of Object.keys(canvas._elementRegistry._elements)) {
      // console.log('importCpnPage(), getViewbox(), key = ', key);

      const element = canvas._elementRegistry._elements[key].element;
      // console.log('importCpnPage(), getViewbox(), element = ', element);

      if (element && element.x && element.y && element.width && element.height) {
        const x = parseInt(element.x);
        const y = parseInt(element.y);

        vb.x = vb.x > x ? x : vb.x;
        vb.y = vb.y > y ? y : vb.y;

        const w = Math.abs(parseInt(element.x) + parseInt(element.width) - vb.x);
        const h = Math.abs(parseInt(element.y) + parseInt(element.height) - vb.y);

        vb.width = vb.width < w ? w : vb.width;
        vb.height = vb.height < h ? h : vb.height;
      }
    }

    // console.log('importCpnPage(), getViewbox(), result vb = ', vb);
    return vb;
  }

}
