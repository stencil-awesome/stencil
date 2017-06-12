import { h } from '../h';
import { toVNode } from '../to-vnode';
import { mockElement, mockDomApi, mockRenderer, mockTextNode } from '../../../test';
const shuffle = require('knuth-shuffle').knuthShuffle;


function prop(name: any) {
  return function(obj: any) {
    return obj[name];
  };
}

function map(fn: any, list: any) {
  var ret = [];
  for (var i = 0; i < list.length; ++i) {
    ret[i] = fn(list[i]);
  }
  return ret;
}

var inner = prop('innerHTML');

describe('renderer', () => {
  const patch = mockRenderer();
  const domApi = mockDomApi();

  var elm: any;
  var vnode0: any;

  beforeEach(function() {
    elm = mockElement('div');
    vnode0 = elm;
  });

  describe('created element', () => {

    it('has tag', () => {
      elm = patch(vnode0, h('div')).n;
      expect(elm.tagName).toEqual('DIV');
    });

    it('has id', () => {
      elm = patch(vnode0, h('div', [h('div#unique')])).n;
      expect(elm.firstChild.id).toEqual('unique');
    });

    it('has correct namespace manually given', () => {
      elm = patch(vnode0, h('div', [h('div', {ns: 'whatever'})])).n;
      expect(elm.firstChild.namespaceURI).toEqual('whatever');
    });

    it('should automatically get svg namespace', function() {
      var SVGNamespace = 'http://www.w3.org/2000/svg';
      var XHTMLNamespace = 'http://www.w3.org/1999/xhtml';

      const svgElm = mockElement('svg');

      elm = patch(svgElm, h('svg', [
        h('foreignObject', [
          h('div', ['I am HTML embedded in SVG'])
        ])
      ])).n;

      expect(elm.namespaceURI).toEqual(SVGNamespace);
      expect(elm.firstChild.namespaceURI).toEqual(SVGNamespace);
      expect(elm.firstChild.firstChild.namespaceURI).toEqual(XHTMLNamespace);

      // verify that svg tag with extra selectors gets svg namespace
      elm = patch(svgElm, h('svg#some-id')).n;
      expect(elm.namespaceURI).toEqual(SVGNamespace);
    });

    it('receives classes in selector', () => {
      elm = patch(vnode0, h('div', [h('i.am.a.class')])).n;
      expect(elm.firstChild.classList.contains('am')).toBeTruthy();
      expect(elm.firstChild.classList.contains('a')).toBeTruthy();
      expect(elm.firstChild.classList.contains('class')).toBeTruthy();
    });

    it('receives classes in class property', () => {
      elm = patch(vnode0, h('i', {class: {am: true, a: true, class: true, not: false}})).n;
      expect(elm.classList.contains('am')).toBeTruthy();
      expect(elm.classList.contains('a')).toBeTruthy();
      expect(elm.classList.contains('class')).toBeTruthy();
      expect(!elm.classList.contains('not')).toBeTruthy();
    });

    it('receives classes in selector when namespaced', () => {
      elm = patch(vnode0,
        h('svg', [
          h('g.am.a.class.too')
        ])
      ).n;
      expect(elm.firstChild.classList.contains('am')).toBeTruthy();
      expect(elm.firstChild.classList.contains('a')).toBeTruthy();
      expect(elm.firstChild.classList.contains('class')).toBeTruthy();
    });

    it('receives classes in class property when namespaced', () => {
      elm = patch(vnode0,
        h('svg', [
          h('g', {class: {am: true, a: true, class: true, not: false, too: true}})
        ])
      ).n;
      expect(elm.firstChild.classList.contains('am')).toBeTruthy();
      expect(elm.firstChild.classList.contains('a')).toBeTruthy();
      expect(elm.firstChild.classList.contains('class')).toBeTruthy();
      expect(!elm.firstChild.classList.contains('not')).toBeTruthy();
    });

    it('handles classes from both selector and property', () => {
      elm = patch(vnode0, h('div', [h('i.has', {class: {classes: true}})])).n;
      expect(elm.firstChild.classList.contains('has')).toBeTruthy();
      expect(elm.firstChild.classList.contains('classes')).toBeTruthy();
    });

    it('can create elements with text content', () => {
      elm = patch(vnode0, h('div', ['I am a string'])).n;
      expect(elm.innerHTML).toEqual('I am a string');
    });

    it('is a patch of the root element', () => {
      var elmWithIdAndClass = mockElement('div');
      elmWithIdAndClass.id = 'id';
      elmWithIdAndClass.className = 'class';

      var vnode1 = h('div#id.class', [h('span', 'Hi')]);
      elm = patch(elmWithIdAndClass, vnode1).n;
      expect(elm.tagName).toEqual('DIV');
      expect(elm.id).toEqual('id');
      expect(elm.className).toEqual('class');
    });

  });

  describe('patching an element', () => {

    it('changes the elements classes', () => {
      var vnode1 = h('i', {class: {i: true, am: true, horse: true}});
      var vnode2 = h('i', {class: {i: true, am: true, horse: false}});
      patch(vnode0, vnode1);
      elm = patch(vnode1, vnode2).n;
      expect(elm.classList.contains('i')).toBeTruthy();
      expect(elm.classList.contains('am')).toBeTruthy();
      expect(!elm.classList.contains('horse')).toBeTruthy();
    });

    it('changes classes in selector', () => {
      var vnode1 = h('i', {class: {i: true, am: true, horse: true}});
      var vnode2 = h('i', {class: {i: true, am: true, horse: false}});
      patch(vnode0, vnode1);
      elm = patch(vnode1, vnode2).n;
      expect(elm.classList.contains('i')).toBeTruthy();
      expect(elm.classList.contains('am')).toBeTruthy();
      expect(!elm.classList.contains('horse')).toBeTruthy();
    });

    it('preserves memoized classes', () => {
      var cachedClass = {i: true, am: true, horse: false};
      var vnode1 = h('i', {class: cachedClass});
      var vnode2 = h('i', {class: cachedClass});
      elm = patch(vnode0, vnode1).n;
      expect(elm.classList.contains('i')).toBeTruthy();
      expect(elm.classList.contains('am')).toBeTruthy();
      expect(!elm.classList.contains('horse')).toBeTruthy();
      elm = patch(vnode1, vnode2).n;
      expect(elm.classList.contains('i')).toBeTruthy();
      expect(elm.classList.contains('am')).toBeTruthy();
      expect(!elm.classList.contains('horse')).toBeTruthy();
    });

    it('removes missing classes', () => {
      var vnode1 = h('i', {class: {i: true, am: true, horse: true}});
      var vnode2 = h('i', {class: {i: true, am: true}});
      patch(vnode0, vnode1);
      elm = patch(vnode1, vnode2).n;
      expect(elm.classList.contains('i')).toBeTruthy();
      expect(elm.classList.contains('am')).toBeTruthy();
      expect(!elm.classList.contains('horse')).toBeTruthy();
    });


    describe('using toVNode()', () => {

      it('can remove previous children of the root element', () => {
        var h2 = mockElement('h2');
        h2.textContent = 'Hello';

        var prevElm = mockElement('div');
        prevElm.id = 'id';
        prevElm.className = 'class';
        prevElm.appendChild(h2);

        var nextVNode = h('div#id.class', [h('span', 'Hi')]);
        elm = patch(toVNode(domApi, prevElm), nextVNode).n;

        expect(elm).toEqual(prevElm);
        expect(elm.tagName).toEqual('DIV');
        expect(elm.id).toEqual('id');
        expect(elm.className).toEqual('class');
        expect(elm.childNodes.length).toEqual(1);
        expect(elm.childNodes[0].tagName).toEqual('SPAN');
        expect(elm.childNodes[0].textContent).toEqual('Hi');
      });

      it('can remove some children of the root element', () => {
        var h2 = mockElement('h2');
        h2.textContent = 'Hello';

        var prevElm = mockElement('div');
        prevElm.id = 'id';
        prevElm.className = 'class';

        var text = mockTextNode('Foobar');
        (<any>text).testProperty = function () {}; // ensures we dont recreate the Text Node
        prevElm.appendChild(text);
        prevElm.appendChild(h2);

        var nextVNode = h('div#id.class', 'Foobar');
        elm = patch(toVNode(domApi, prevElm), nextVNode).n;

        expect(elm).toEqual(prevElm);
        expect(elm.tagName).toEqual('DIV');
        expect(elm.id).toEqual('id');
        expect(elm.className).toEqual('class');
        expect(elm.childNodes.length).toEqual(1);
        expect(elm.childNodes[0].nodeType).toEqual(3);
        expect(elm.childNodes[0].wholeText).toEqual('Foobar');
        expect(typeof elm.childNodes[0].testProperty).toEqual('function');
      });

      it('can remove text elements', () => {
        var h2 = mockElement('h2');
        h2.textContent = 'Hello';

        var prevElm = mockElement('div');
        prevElm.id = 'id';
        prevElm.className = 'class';

        var text = mockTextNode('Foobar');
        prevElm.appendChild(text);
        prevElm.appendChild(h2);

        var nextVNode = h('div#id.class', [h('h2', 'Hello')]);
        elm = patch(toVNode(domApi, prevElm), nextVNode).n;

        expect(elm).toEqual(prevElm);
        expect(elm.tagName).toEqual('DIV');
        expect(elm.id).toEqual('id');
        expect(elm.className).toEqual('class');
        expect(elm.childNodes.length).toEqual(1);
        expect(elm.childNodes[0].nodeType).toEqual(1);
        expect(elm.childNodes[0].textContent).toEqual('Hello');
      });

    });

    describe('updating children with keys', () => {
      function spanNum(n: any) {
        if (n == null) {
          return n;
        } else if (typeof n === 'string') {
          return h('span', {}, n);
        } else {
          return h('span', {key: n}, n.toString());
        }
      }

      describe('addition of elements', () => {

        it('appends elements', () => {
          var vnode1 = h('span', [1].map(spanNum));
          var vnode2 = h('span', [1, 2, 3].map(spanNum));

          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(1);

          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(3);
          expect(elm.children[1].innerHTML).toEqual('2');
          expect(elm.children[2].innerHTML).toEqual('3');
        });

        it('prepends elements', () => {
          var vnode1 = h('span', [4, 5].map(spanNum));
          var vnode2 = h('span', [1, 2, 3, 4, 5].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(2);
          elm = patch(vnode1, vnode2).n;
          expect(map(inner, elm.children)).toEqual(['1', '2', '3', '4', '5']);
        });

        it('add elements in the middle', () => {
          var vnode1 = h('span', [1, 2, 4, 5].map(spanNum));
          var vnode2 = h('span', [1, 2, 3, 4, 5].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(4);
          expect(elm.children.length).toEqual(4);
          elm = patch(vnode1, vnode2).n;
          expect(map(inner, elm.children)).toEqual(['1', '2', '3', '4', '5']);
        });

        it('add elements at begin and end', () => {
          var vnode1 = h('span', [2, 3, 4].map(spanNum));
          var vnode2 = h('span', [1, 2, 3, 4, 5].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(3);
          elm = patch(vnode1, vnode2).n;
          expect(map(inner, elm.children)).toEqual(['1', '2', '3', '4', '5']);
        });

        it('adds children to parent with no children', () => {
          var vnode1 = h('span', {key: 'span'});
          var vnode2 = h('span', {key: 'span'}, [1, 2, 3].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(0);
          elm = patch(vnode1, vnode2).n;
          expect(map(inner, elm.children)).toEqual(['1', '2', '3']);
        });

        it('removes all children from parent', () => {
          var vnode1 = h('span', {key: 'span'}, [1, 2, 3].map(spanNum));
          var vnode2 = h('span', {key: 'span'});
          elm = patch(vnode0, vnode1).n;
          expect(map(inner, elm.children)).toEqual(['1', '2', '3']);
          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(0);
        });

        it('update one child with same key but different sel', () => {
          var vnode1 = h('span', {key: 'spans'}, [1, 2, 3].map(spanNum));
          var vnode2 = h('span', {key: 'span'}, [spanNum(1), h('i', {key: 2}, '2'), spanNum(3)]);
          elm = patch(vnode0, vnode1).n;
          expect(map(inner, elm.children)).toEqual(['1', '2', '3']);
          elm = patch(vnode1, vnode2).n;
          expect(map(inner, elm.children)).toEqual(['1', '2', '3']);
          expect(elm.children.length).toEqual(3);
          expect(elm.children[1].tagName).toEqual('I');
        });

      });

      describe('removal of elements', () => {

        it('removes elements from the beginning', () => {
          var vnode1 = h('span', [1, 2, 3, 4, 5].map(spanNum));
          var vnode2 = h('span', [3, 4, 5].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(5);
          elm = patch(vnode1, vnode2).n;
          expect(map(inner, elm.children)).toEqual(['3', '4', '5']);
        });

        it('removes elements from the end', () => {
          var vnode1 = h('span', [1, 2, 3, 4, 5].map(spanNum));
          var vnode2 = h('span', [1, 2, 3].map(spanNum));

          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(5);

          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(3);

          expect(elm.children[0].innerHTML).toEqual('1');
          expect(elm.children[1].innerHTML).toEqual('2');
          expect(elm.children[2].innerHTML).toEqual('3');
        });

        it('removes elements from the middle', () => {
          var vnode1 = h('span', [1, 2, 3, 4, 5].map(spanNum));
          var vnode2 = h('span', [1, 2, 4, 5].map(spanNum));

          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(5);

          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(4);

          expect(elm.children[0].innerHTML).toEqual('1');
          expect(elm.children[1].innerHTML).toEqual('2');
          expect(elm.children[2].innerHTML).toEqual('4');
          expect(elm.children[3].innerHTML).toEqual('5');
        });

        it('removes child svg elements', () => {
          vnode0 = mockElement('svg');

          var a = h('svg', {}, [
            h('g'),
            h('g')
          ]);
          var b = h('svg', {}, [
            h('g')
          ]);

          var result = patch(patch(vnode0, a), b).n;
          expect(result.childNodes.length).toEqual(1);
        });

      });

      describe('element reordering', () => {

        it('moves element forward', () => {
          var vnode1 = h('span', [1, 2, 3, 4].map(spanNum));
          var vnode2 = h('span', [2, 3, 1, 4].map(spanNum));

          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(4);

          (<any>elm.children[0]).instance = 1;
          (<any>elm.children[1]).instance = 2;
          (<any>elm.children[2]).instance = 3;
          (<any>elm.children[3]).instance = 4;

          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(4);

          expect(elm.children[0].innerHTML).toEqual('2');
          expect(elm.children[0].instance).toEqual(2);

          expect(elm.children[1].innerHTML).toEqual('3');
          expect(elm.children[1].instance).toEqual(3);

          expect(elm.children[2].innerHTML).toEqual('1');
          expect(elm.children[2].instance).toEqual(1);

          expect(elm.children[3].innerHTML).toEqual('4');
          expect(elm.children[3].instance).toEqual(4);
        });

        it('moves element to end', () => {
          var vnode1 = h('span', [1, 2, 3].map(spanNum));
          var vnode2 = h('span', [2, 3, 1].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(3);
          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(3);
          expect(elm.children[0].innerHTML).toEqual('2');
          expect(elm.children[1].innerHTML).toEqual('3');
          expect(elm.children[2].innerHTML).toEqual('1');
        });

        it('moves element backwards', () => {
          var vnode1 = h('span', [1, 2, 3, 4].map(spanNum));
          var vnode2 = h('span', [1, 4, 2, 3].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(4);
          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(4);
          expect(elm.children[0].innerHTML).toEqual('1');
          expect(elm.children[1].innerHTML).toEqual('4');
          expect(elm.children[2].innerHTML).toEqual('2');
          expect(elm.children[3].innerHTML).toEqual('3');
        });

        it('swaps first and last', () => {
          var vnode1 = h('span', [1, 2, 3, 4].map(spanNum));
          var vnode2 = h('span', [4, 2, 3, 1].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(4);
          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(4);
          expect(elm.children[0].innerHTML).toEqual('4');
          expect(elm.children[1].innerHTML).toEqual('2');
          expect(elm.children[2].innerHTML).toEqual('3');
          expect(elm.children[3].innerHTML).toEqual('1');
        });

      });

      describe('combinations of additions, removals and reorderings', () => {

        it('move to left and replace', () => {
          var vnode1 = h('span', [1, 2, 3, 4, 5].map(spanNum));
          var vnode2 = h('span', [4, 1, 2, 3, 6].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(5);
          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(5);
          expect(elm.children[0].innerHTML).toEqual('4');
          expect(elm.children[1].innerHTML).toEqual('1');
          expect(elm.children[2].innerHTML).toEqual('2');
          expect(elm.children[3].innerHTML).toEqual('3');
          expect(elm.children[4].innerHTML).toEqual('6');
        });

        it('moves to left and leaves hole', () => {
          var vnode1 = h('span', [1, 4, 5].map(spanNum));
          var vnode2 = h('span', [4, 6].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(3);

          elm = patch(vnode1, vnode2).n;
          expect(map(inner, elm.children)).toEqual(['4', '6']);
        });

        it('handles moved and set to undefined element ending at the end', () => {
          var vnode1 = h('span', [2, 4, 5].map(spanNum));
          var vnode2 = h('span', [4, 5, 3].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.children.length).toEqual(3);
          elm = patch(vnode1, vnode2).n;
          expect(elm.children.length).toEqual(3);
          expect(elm.children[0].innerHTML).toEqual('4');
          expect(elm.children[1].innerHTML).toEqual('5');
          expect(elm.children[2].innerHTML).toEqual('3');
        });

        it('moves a key in non-keyed nodes with a size up', () => {
          var vnode1 = h('span', [1, 'a', 'b', 'c'].map(spanNum));
          var vnode2 = h('span', ['d', 'a', 'b', 'c', 1, 'e'].map(spanNum));
          elm = patch(vnode0, vnode1).n;
          expect(elm.childNodes.length).toEqual(4);
          expect(elm.textContent).toEqual('1abc');

          elm = patch(vnode1, vnode2).n;
          // expect(elm.childNodes.length).toEqual(6);
          // expect(elm.textContent).toEqual('dabc1e');
        });

      });

      it('reverses elements', () => {
        var vnode1 = h('span', [1, 2, 3, 4, 5, 6, 7, 8].map(spanNum));
        var vnode2 = h('span', [8, 7, 6, 5, 4, 3, 2, 1].map(spanNum));
        elm = patch(vnode0, vnode1).n;
        expect(elm.children.length).toEqual(8);
        elm = patch(vnode1, vnode2).n;
        expect(map(inner, elm.children)).toEqual(['8', '7', '6', '5', '4', '3', '2', '1']);
      });

      it('something', () => {
        var vnode1 = h('span', [0, 1, 2, 3, 4, 5].map(spanNum));
        var vnode2 = h('span', [4, 3, 2, 1, 5, 0].map(spanNum));
        elm = patch(vnode0, vnode1).n;
        expect(elm.children.length).toEqual(6);
        elm = patch(vnode1, vnode2).n;
        expect(map(inner, elm.children)).toEqual(['4', '3', '2', '1', '5', '0']);
      });

      it('handles random shuffles', () => {
        var n, i, arr = [], opacities: any[] = [], elms = 14, samples = 5;
        function spanNumWithOpacity(n: any, o: any) {
          return h('span', {key: n, style: {opacity: o}}, n.toString());
        }
        for (n = 0; n < elms; ++n) { arr[n] = n; }
        for (n = 0; n < samples; ++n) {
          var vnode1 = h('span', arr.map(function(n) {
            return spanNumWithOpacity(n, '1');
          }));
          var shufArr = shuffle(arr.slice(0));
          var elm: any = mockElement('div');
          elm = patch(elm, vnode1).n;
          for (i = 0; i < elms; ++i) {
            expect(elm.children[i].innerHTML).toEqual(i.toString());
            opacities[i] = Math.random().toFixed(5).toString();
          }
          var vnode2 = h('span', arr.map(function(n) {
            return spanNumWithOpacity(shufArr[n], opacities[n]);
          }));
          elm = patch(vnode1, vnode2).n;
          for (i = 0; i < elms; ++i) {
            expect(elm.children[i].innerHTML).toEqual(shufArr[i].toString());
            expect(opacities[i].indexOf(elm.children[i].style.opacity)).toEqual(0);
          }
        }
      });

      it('supports null/undefined children', () => {
        var vnode1 = h('i', [0, 1, 2, 3, 4, 5].map(spanNum));
        var vnode2 = h('i', [null, 2, undefined, null, 1, 0, null, 5, 4, null, 3, undefined].map(spanNum));
        elm = patch(vnode0, vnode1).n;
        expect(elm.children.length).toEqual(6);
        elm = patch(vnode1, vnode2).n;
        expect(map(inner, elm.children)).toEqual(['2', '1', '0', '5', '4', '3']);
      });

      it('supports all null/undefined children', () => {
        var vnode1 = h('i', [0, 1, 2, 3, 4, 5].map(spanNum));
        var vnode2 = h('i', [null, null, undefined, null, null, undefined]);
        var vnode3 = h('i', [5, 4, 3, 2, 1, 0].map(spanNum));
        patch(vnode0, vnode1);
        elm = patch(vnode1, vnode2).n;
        expect(elm.children.length).toEqual(0);
        elm = patch(vnode2, vnode3).n;
        expect(map(inner, elm.children)).toEqual(['5', '4', '3', '2', '1', '0']);
      });
      it('handles random shuffles with null/undefined children', () => {
        var i, j, r, len, arr, maxArrLen = 15, samples = 5, vnode1 = vnode0, vnode2;
        for (i = 0; i < samples; ++i, vnode1 = vnode2) {
          len = Math.floor(Math.random() * maxArrLen);
          arr = [];
          for (j = 0; j < len; ++j) {
            if ((r = Math.random()) < 0.5) arr[j] = String(j);
            else if (r < 0.75) arr[j] = null;
            else arr[j] = undefined;
          }
          shuffle(arr);
          vnode2 = h('div', arr.map(spanNum));
          elm = patch(vnode1, vnode2).n;
          expect(map(inner, elm.children)).toEqual(arr.filter(function(x) {return x != null; }));
        }
      });
    });

    describe('updating children without keys', () => {

      it('appends elements', () => {
        var vnode1 = h('div', [h('span', 'Hello')]);
        var vnode2 = h('div', [h('span', 'Hello'), h('span', 'World')]);
        elm = patch(vnode0, vnode1).n;
        expect(map(inner, elm.children)).toEqual(['Hello']);
        elm = patch(vnode1, vnode2).n;
        expect(map(inner, elm.children)).toEqual(['Hello', 'World']);
      });

      it('handles unmoved text nodes', () => {
        var vnode1 = h('div', [
          'Text',
          h('span', 'Span')
        ]);
        var vnode2 = h('div', ['Text', h('span', 'Span')]);

        elm = patch(vnode0, vnode1).n;
        expect(elm.childNodes[0].textContent).toEqual('Text');

        elm = patch(vnode1, vnode2).n;
        expect(elm.childNodes[0].textContent).toEqual('Text');
      });

      it('handles changing text children', () => {
        var vnode1 = h('div', ['Text', h('span', 'Span')]);
        var vnode2 = h('div', ['Text2', h('span', 'Span')]);
        elm = patch(vnode0, vnode1).n;
        expect(elm.childNodes[0].textContent).toEqual('Text');
        elm = patch(vnode1, vnode2).n;
        expect(elm.childNodes[0].textContent).toEqual('Text2');
      });

      it('prepends element', () => {
        var vnode1 = h('div', [h('span', 'World')]);
        var vnode2 = h('div', [h('span', 'Hello'), h('span', 'World')]);
        elm = patch(vnode0, vnode1).n;
        expect(map(inner, elm.children)).toEqual(['World']);
        elm = patch(vnode1, vnode2).n;
        expect(map(inner, elm.children)).toEqual(['Hello', 'World']);
      });

      it('prepends element of different tag type', () => {
        var vnode1 = h('div', [h('span', 'World')]);
        var vnode2 = h('div', [h('div', 'Hello'), h('span', 'World')]);
        elm = patch(vnode0, vnode1).n;
        expect(map(inner, elm.children)).toEqual(['World']);
        elm = patch(vnode1, vnode2).n;
        expect(map(prop('tagName'), elm.children)).toEqual(['DIV', 'SPAN']);
        expect(map(inner, elm.children)).toEqual(['Hello', 'World']);
      });

      it('removes elements', () => {
        var vnode1 = h('div', [h('span', 'One'), h('span', 'Two'), h('span', 'Three')]);
        var vnode2 = h('div', [h('span', 'One'), h('span', 'Three')]);

        elm = patch(vnode0, vnode1).n;
        expect(map(inner, elm.children)).toEqual(['One', 'Two', 'Three']);

        elm = patch(vnode1, vnode2).n;
        expect(map(inner, elm.children)).toEqual(['One', 'Three']);
      });

      it('removes a single text node', () => {
        var vnode1 = h('div', 'One');
        var vnode2 = h('div');

        elm = patch(vnode0, vnode1).n;
        expect(elm.textContent).toEqual('One');

        patch(vnode1, vnode2);
        expect(elm.textContent).toEqual('');
      });

      it('removes a single text node when children are updated', () => {
        var vnode1 = h('div', 'One');
        var vnode2 = h('div', [ h('div', 'Two'), h('span', 'Three') ]);
        elm = patch(vnode0, vnode1).n;
        expect(elm.textContent).toEqual('One');
        patch(vnode1, vnode2);
        expect(map(prop('textContent'), elm.childNodes)).toEqual(['Two', 'Three']);
      });
      it('removes a text node among other elements', () => {
        var vnode1 = h('div', [ 'One', h('span', 'Two') ]);
        var vnode2 = h('div', [ h('div', 'Three')]);
        elm = patch(vnode0, vnode1).n;
        expect(map(prop('textContent'), elm.childNodes)).toEqual(['One', 'Two']);
        patch(vnode1, vnode2);
        expect(elm.childNodes.length).toEqual(1);
        expect(elm.childNodes[0].tagName).toEqual('DIV');
        expect(elm.childNodes[0].textContent).toEqual('Three');
      });

      it('reorders elements', () => {
        var vnode1 = h('div', [h('span', 'One'), h('div', 'Two'), h('b', 'Three')]);
        var vnode2 = h('div', [h('b', 'Three'), h('span', 'One'), h('div', 'Two')]);
        elm = patch(vnode0, vnode1).n;
        expect(map(inner, elm.children)).toEqual(['One', 'Two', 'Three']);
        elm = patch(vnode1, vnode2).n;
        expect(map(prop('tagName'), elm.children)).toEqual(['B', 'SPAN', 'DIV']);
        expect(map(inner, elm.children)).toEqual(['Three', 'One', 'Two']);
      });

      it('supports null/undefined children', () => {
        var vnode1 = h('i', [null, h('i', '1'), h('i', '2'), null]);
        var vnode2 = h('i', [h('i', '2'), undefined, undefined, h('i', '1'), undefined]);
        var vnode3 = h('i', [null, h('i', '1'), undefined, null, h('i', '2'), undefined, null]);

        elm = patch(vnode0, vnode1).n;
        expect(map(inner, elm.children)).toEqual(['1', '2']);

        elm = patch(vnode1, vnode2).n;
        expect(map(inner, elm.children)).toEqual(['2', '1']);

        elm = patch(vnode2, vnode3).n;
        expect(map(inner, elm.children)).toEqual(['1', '2']);
      });

      it('supports all null/undefined children', () => {
        var vnode1 = h('i', [h('i', '1'), h('i', '2')]);
        var vnode2 = h('i', [null, undefined]);
        var vnode3 = h('i', [h('i', '2'), h('i', '1')]);
        patch(vnode0, vnode1);
        elm = patch(vnode1, vnode2).n;
        expect(elm.children.length).toEqual(0);
        elm = patch(vnode2, vnode3).n;
        expect(map(inner, elm.children)).toEqual(['2', '1']);
      });

    });

  });

});
