/* bender-tags: editor,table */
/* bender-ckeditor-plugins: basicstyles,undo,table,tabletools,sourcearea,toolbar */

( function() {
	'use strict';

	bender.editor = {
		config: {
			// They make HTML comparison different in build and dev modes.
			removePlugins: 'htmlwriter,entities'
		}
	};

	var selectedClass = 'cke_table-faked-selection';

	function getRangesForCells( editor, table, indexes ) {
		var ranges = [],
			range,
			cell,
			i;

		for ( i = 0; i < indexes.length; i++ ) {
			cell = table.find( 'td' ).getItem( indexes[ i ] );
			range = editor.createRange();

			cell.addClass( selectedClass );
			range.setStartBefore( cell );
			range.setEndAfter( cell );

			ranges.push( range );
		}

		return ranges;
	}

	function clearTableSelection( editable ) {
		var selected = editable.find( selectedClass ),
			i;

		for ( i = 0; i < selected.count(); i++ ) {
			selected.getItem( i ).removeClass( selectedClass );
		}
	}

	bender.test( {
		'Check if selection is in table': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				table,
				ranges;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );
			table = editor.editable().findOne( 'table' );

			// Real table selection (one cell).
			selection.selectElement( table.findOne( 'td' ) );
			assert.isTrue( selection.isInTable() );

			// Real table selection (one row).
			selection.selectElement( table.findOne( 'tr' ) );
			assert.isTrue( selection.isInTable() );

			// Real table selection (tbody).
			selection.selectElement( table.findOne( 'tbody' ) );
			assert.isTrue( selection.isInTable() );

			// Real table selection (table).
			selection.selectElement( table );
			assert.isTrue( selection.isInTable() );

			// Fake table selection.
			ranges = getRangesForCells( editor, table, [ 0, 3 ] );
			selection.selectRanges( ranges );
			assert.isTrue( selection.isInTable() );
			clearTableSelection( editor.editable() );

			// Selecting only text node in table.
			selection.selectElement( table.findOne( 'td' ).getChild( 0 ) );
			assert.isFalse( selection.isInTable() );

			// Selecting paragraph.
			selection.selectElement( editor.document.getById( 'foo' ) );
			assert.isFalse( selection.isInTable() );
		},

		'Make fake table selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				initialRev = selection.rev,
				realSelection,
				ranges;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 1, 4 ] );

			selection.selectRanges( ranges );

			assert.isTrue( !!selection.isFake, 'isFake is set' );
			assert.isTrue( selection.rev > initialRev, 'Next rev' );
			assert.areSame( ranges.length, selection.getRanges().length, 'Multiple ranges are selected' );
			assert.isNull( selection.getNative(), 'getNative() should be null' );
			assert.isNull( selection.getSelectedText(), 'getSelectedText() should be null' );

			assert.areSame( CKEDITOR.SELECTION_TEXT, selection.getType(), 'Text type selection' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'Selected element equals to the first selected cell' );

			realSelection = editor.getSelection( 1 );

			assert.areSame( 1, realSelection.getRanges().length, 'Real selection has only one range' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( realSelection.getSelectedElement() ),
				'Real selected element equals to the first selected cell' );

			clearTableSelection( editor.editable() );
		},

		'Reset fake-selection': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );
			selection.selectRanges( ranges );

			selection.reset();

			assert.isFalse( !!selection.isFake, 'isFake is not set' );

			assert.areSame( 1, selection.getRanges().length, 'Only first range remains selected' );
			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() equals to the first selected cell' );
			assert.isNotNull( selection.getNative(), 'getNative() should not be null' );

			clearTableSelection( editor.editable() );
		},

		'Fire selectionchange event': function() {
			var editor = this.editor,
				selectionChange = 0,
				selection = editor.getSelection(),
				ranges,
				selectedElement;

			bender.tools.setHtmlWithSelection( editor, CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			var listener = editor.on( 'selectionChange', function( evt ) {
				selectionChange++;
				selectedElement = evt.data.selection.getSelectedElement();
			} );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );
			selection.selectRanges( ranges );

			wait( function() {
				listener.removeListener();

				assert.areSame( 1, selectionChange, 'selectionChange was fired only once' );
				assert.areSame( ranges[ 0 ].getEnclosedNode(), selectedElement,
					'getSelectedElement() must be the first selected table cell' );

				clearTableSelection( editor.editable() );
			}, 50 );
		},

		'Change selection': function() {
			var editor = this.editor,
				ranges;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );
			editor.getSelection().selectRanges( ranges );

			wait( function() {
				var selectionChange = 0,
					selectedRanges,
					range;

				editor.on( 'selectionChange', function( evt ) {
					selectionChange++;
					selectedRanges = evt.data.selection.getRanges();
				} );

				range = editor.createRange();
				range.setStart( editor.document.getById( 'foo' ), 0 );
				editor.getSelection().selectRanges( [ range ] );

				wait( function() {
					var range = selectedRanges[ 0 ];

					assert.areSame( 1, selectionChange, 'selectionChange was fired only once' );

					range.optimize();
					assert.areSame( editor.document.getById( 'foo' ), range.startContainer );

					clearTableSelection( editor.editable() );
				}, 50 );
			}, 50 );
		},

		'Fake-selection bookmark': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges,
				bookmarks;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );
			selection.selectRanges( ranges );

			// Bookmark it.
			bookmarks = selection.createBookmarks();

			// Move the selection somewhere else.
			selection.selectElement( editor.document.getById( 'foo' ) );

			assert.isFalse( !!selection.isFake, 'Selection is no longer fake' );

			selection.selectBookmarks( bookmarks );

			// For the unknown reasons, selecting bookmarks modifies original ranges.
			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 1 ] );

			assert.isTrue( !!selection.isFake, 'isFake is set' );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() must return the first selected table cell' );
			assert.areSame( ranges.length, selection.getRanges().length, 'All ranges selected' );

			clearTableSelection( editor.editable() );
		},

		'Fake-selection bookmark (serializable)': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges,
				table,
				bookmarks;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );
			selection.selectRanges( ranges );


			// Bookmark it.
			bookmarks = selection.createBookmarks( true );

			// Move the selection somewhere else.
			selection.selectElement( editor.document.getById( 'foo' ) );

			// Replace the table with its clone.
			table = editor.editable().findOne( 'table' );
			table.clone( true, true ).replace( table );

			selection.selectBookmarks( bookmarks );

			assert.isTrue( !!selection.isFake, 'isFake is set' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() must return the first selected table cell' );
			assert.areSame( ranges.length, selection.getRanges().length, 'All ranges selected' );

			clearTableSelection( editor.editable() );
		},

		'Fake-selection bookmark 2': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges,
				bookmarks;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );
			selection.selectRanges( ranges );

			// Bookmark it.
			bookmarks = selection.createBookmarks2();

			// Move the selection somewhere else.
			selection.selectElement( editor.document.getById( 'foo' ) );

			selection.selectBookmarks( bookmarks );

			assert.isTrue( !!selection.isFake, 'isFake is set' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() must return the first selected table cell' );
			assert.areSame( ranges.length, selection.getRanges().length, 'All ranges selected' );

			clearTableSelection( editor.editable() );
		},

		'Fake-selection bookmark 2 (normalized)': function() {
			var editor = this.editor,
				selection = editor.getSelection(),
				ranges,
				bookmarks;

			bender.tools.setHtmlWithSelection( editor, '<p id="foo">Foo</p>' +
				CKEDITOR.document.getById( 'simpleTable' ).getHtml() );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );
			selection.selectRanges( ranges );

			// Bookmark it.
			bookmarks = selection.createBookmarks2( true );

			// Move the selection somewhere else.
			selection.selectElement( editor.document.getById( 'foo' ) );

			// Replace the editor DOM.
			editor.editable().setHtml( editor.editable().getHtml() );

			selection.selectBookmarks( bookmarks );

			assert.isTrue( !!selection.isFake, 'isFake is set' );

			ranges = getRangesForCells( editor, editor.editable().findOne( 'table' ), [ 0, 3 ] );

			assert.isTrue( ranges[ 0 ].getEnclosedNode().equals( selection.getSelectedElement() ),
				'getSelectedElement() must return the first selected table cell' );
			assert.areSame( ranges.length, selection.getRanges().length, 'All ranges selected' );

			clearTableSelection( editor.editable() );
		}
	} );
}() );
