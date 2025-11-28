import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

function TextEditor({ content, onContentChange }) {
  const editorConfig = {
    height: '100%',
    menubar: false,
    plugins: [
      'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 'lists', 'searchreplace', 'table', 'visualblocks', 'wordcount'
    ],
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
    font_family_formats: 'Arial=arial,helvetica,sans-serif; Comic Neue=Comic Neue,cursive; Comic Sans MS=comic sans ms,cursive; Courier New=courier new,courier,monospace; Georgia=georgia,palatino,serif; Helvetica=helvetica,arial,sans-serif; Impact=impact,chicago; Lato=Lato,sans-serif; Montserrat=Montserrat,sans-serif; Nunito=Nunito,sans-serif; Open Sans=Open Sans,sans-serif; Poppins=Poppins,sans-serif; Roboto=Roboto,sans-serif; Source Sans Pro=Source Sans Pro,sans-serif; Times New Roman=times new roman,times,serif; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva;',
    textcolor_map: [
      '000000', 'Black',
      '4D4D4D', 'Dim Gray',
      '999999', 'Gray',
      'E6E6E6', 'Light Gray',
      'FFFFFF', 'White',
      'FF0000', 'Red',
      'FF6600', 'Orange',
      'FFCC00', 'Yellow',
      '00CC00', 'Green',
      '0066FF', 'Blue',
      '6600FF', 'Purple',
      'FF0066', 'Pink',
      'FF6600', 'Orange',
      '00CCCC', 'Cyan',
      '993300', 'Brown',
      'FFCC99', 'Light Orange',
      'CCFFCC', 'Light Green',
      'CCCCFF', 'Light Blue',
      'FFCCFF', 'Light Pink'
    ],
    textcolor_cols: 6,
    textcolor_rows: 3,
    content_style: `
      body { 
        font-family: 'Roboto', Arial, Helvetica, sans-serif; 
        font-size: 16px; 
        line-height: 1.6; 
        margin: 0; 
        padding: 20px; 
        color: #333;
      }
      
      h1 {
        font-size: 2.5em;
        font-weight: 600;
        margin: 1.5em 0 0.5em 0;
        line-height: 1.2;
        color: #1a1a1a;
        border-bottom: 2px solid #e1e5e9;
        padding-bottom: 0.3em;
      }
      
      h2 {
        font-size: 2em;
        font-weight: 600;
        margin: 1.3em 0 0.4em 0;
        line-height: 1.3;
        color: #1a1a1a;
      }
      
      h3 {
        font-size: 1.5em;
        font-weight: 600;
        margin: 1.1em 0 0.3em 0;
        line-height: 1.4;
        color: #1a1a1a;
      }
      
      h4 {
        font-size: 1.25em;
        font-weight: 600;
        margin: 1em 0 0.3em 0;
        line-height: 1.4;
        color: #1a1a1a;
      }
      
      h5 {
        font-size: 1.1em;
        font-weight: 600;
        margin: 0.9em 0 0.3em 0;
        line-height: 1.4;
        color: #1a1a1a;
      }
      
      h6 {
        font-size: 1em;
        font-weight: 600;
        margin: 0.8em 0 0.3em 0;
        line-height: 1.4;
        color: #1a1a1a;
      }
      
      p {
        margin: 0 0 1em 0;
        line-height: 1.6;
        color: #333;
      }
      
      ul, ol {
        margin: 1em 0;
        padding-left: 2em;
        line-height: 1.6;
      }
      
      ul {
        list-style-type: disc;
      }
      
      ol {
        list-style-type: decimal;
      }
      
      li {
        margin: 0.3em 0;
        line-height: 1.6;
      }
      
      ul ul, ol ol, ul ol, ol ul {
        margin: 0.5em 0;
      }
      
      strong, b {
        font-weight: 600;
        color: #1a1a1a;
      }
      
      em, i {
        font-style: italic;
      }
      
      u {
        text-decoration: underline;
        text-decoration-color: #333;
      }
      
      s, strike {
        text-decoration: line-through;
        text-decoration-color: #666;
      }
      
      a {
        color: #0066cc;
        text-decoration: underline;
        text-decoration-color: #0066cc;
      }
      
      a:hover {
        color: #0052a3;
        text-decoration-color: #0052a3;
      }
      
      blockquote {
        margin: 1.5em 0;
        padding: 1em 1.5em;
        border-left: 4px solid #0066cc;
        background-color: #f8f9fa;
        font-style: italic;
        color: #555;
      }
      
      blockquote p {
        margin: 0;
      }
      
      pre {
        margin: 1.5em 0;
        padding: 1em;
        background-color: #f8f9fa;
        border: 1px solid #e1e5e9;
        border-radius: 4px;
        overflow-x: auto;
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        line-height: 1.4;
        color: #333;
      }
      
      code {
        background-color: #f8f9fa;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.9em;
        color: #e83e8c;
      }
      
      table {
        border-collapse: collapse;
        margin: 1.5em 0;
        width: 100%;
        border: 1px solid #e1e5e9;
        border-radius: 4px;
        overflow: hidden;
      }
      
      th, td {
        border: 1px solid #e1e5e9;
        padding: 0.75em;
        text-align: left;
        vertical-align: top;
      }
      
      th {
        background-color: #f8f9fa;
        font-weight: 600;
        color: #1a1a1a;
        border-bottom: 2px solid #e1e5e9;
      }
      
      tr:nth-child(even) {
        background-color: #fafbfc;
      }
      
      tr:hover {
        background-color: #f0f2f5;
      }
      
      img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 1em 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      hr {
        margin: 2em 0;
        border: none;
        border-top: 1px solid #e1e5e9;
        height: 1px;
      }
      
      dl {
        margin: 1em 0;
      }
      
      dt {
        font-weight: 600;
        color: #1a1a1a;
        margin-top: 1em;
      }
      
      dd {
        margin-left: 2em;
        margin-bottom: 0.5em;
      }
      
      sub {
        vertical-align: sub;
        font-size: 0.8em;
      }
      
      sup {
        vertical-align: super;
        font-size: 0.8em;
      }
      
      small {
        font-size: 0.875em;
        color: #666;
      }
      
      mark {
        background-color: #fff3cd;
        padding: 0.1em 0.2em;
        border-radius: 2px;
      }
      
      p:first-child {
        margin-top: 0;
      }
      
      p:last-child {
        margin-bottom: 0;
      }
    `,
    setup: (editor) => {
      editor.on('init', () => {
        editor.focus();
      });
    }
  };

  return (
    <Editor
      apiKey='l1htx10scfunizdawurrb9j2njqukthv8eb30m6rr0r64177'
      value={content}
      onEditorChange={onContentChange}
      init={editorConfig}
    />
  );
}

export default TextEditor;
