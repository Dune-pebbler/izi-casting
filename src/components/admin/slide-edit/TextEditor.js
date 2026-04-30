import React from "react";
import { Editor } from "@tinymce/tinymce-react";

// Available fonts mapping
const AVAILABLE_FONTS = {
  Arial: "Arial=arial,helvetica,sans-serif",
  "Comic Neue": "Comic Neue=Comic Neue,cursive",
  "Comic Sans MS": "Comic Sans MS=comic sans ms,cursive",
  "Courier New": "Courier New=courier new,courier,monospace",
  Georgia: "Georgia=georgia,palatino,serif",
  Helvetica: "Helvetica=helvetica,arial,sans-serif",
  Impact: "Impact=impact,chicago",
  Lato: "Lato=Lato,sans-serif",
  Montserrat: "Montserrat=Montserrat,sans-serif",
  Nunito: "Nunito=Nunito,sans-serif",
  "Open Sans": "Open Sans=Open Sans,sans-serif",
  Poppins: "Poppins=Poppins,sans-serif",
  Roboto: "Roboto=Roboto,sans-serif",
  "Source Sans Pro": "Source Sans Pro=Source Sans Pro,sans-serif",
  "Times New Roman": "Times New Roman=times new roman,times,serif",
  "Trebuchet MS": "Trebuchet MS=trebuchet ms,geneva",
  Verdana: "Verdana=verdana,geneva",
};

function TextEditor({ content, onContentChange, enabledFonts, typography }) {
  const typo = {
    p: { fontSize: 27, fontFamily: "Roboto", ...(typography?.p || {}) },
    h1: { fontSize: 64, fontFamily: "Roboto", ...(typography?.h1 || {}) },
    h2: { fontSize: 53, fontFamily: "Roboto", ...(typography?.h2 || {}) },
    h3: { fontSize: 43, fontFamily: "Roboto", ...(typography?.h3 || {}) },
  };

  // Build font_family_formats string from enabled fonts
  const fontFormats =
    enabledFonts && enabledFonts.length > 0
      ? enabledFonts
          .map((fontName) => AVAILABLE_FONTS[fontName])
          .filter(Boolean)
          .join("; ")
      : Object.values(AVAILABLE_FONTS).join("; ");

  const editorConfig = {
    height: "100%",
    menubar: false,
    plugins: [
      "anchor",
      "autolink",
      "charmap",
      "codesample",
      "emoticons",
      "lists",
      "searchreplace",
      "table",
      "visualblocks",
      "wordcount",
    ],
    toolbar:
      "undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat",
    block_formats: "Paragraaf=p; Header 1=h1; Header 2=h2; Header 3=h3",
    font_family_formats: fontFormats,
    textcolor_map: [
      "000000",
      "Black",
      "4D4D4D",
      "Dim Gray",
      "999999",
      "Gray",
      "E6E6E6",
      "Light Gray",
      "FFFFFF",
      "White",
      "FF0000",
      "Red",
      "FF6600",
      "Orange",
      "FFCC00",
      "Yellow",
      "00CC00",
      "Green",
      "0066FF",
      "Blue",
      "6600FF",
      "Purple",
      "FF0066",
      "Pink",
      "FF6600",
      "Orange",
      "00CCCC",
      "Cyan",
      "993300",
      "Brown",
      "FFCC99",
      "Light Orange",
      "CCFFCC",
      "Light Green",
      "CCCCFF",
      "Light Blue",
      "FFCCFF",
      "Light Pink",
    ],
    textcolor_cols: 6,
    textcolor_rows: 3,
    content_style: `
      body {
        font-family: 'Roboto', Arial, Helvetica, sans-serif;
        font-size: 27px;
        line-height: 1.6;
        margin: 0;
        padding: 20px;
        color: #333;
      }

      h1 {
        font-size: ${typo.h1.fontSize}px;
        font-family: ${typo.h1.fontFamily}, sans-serif;
        font-weight: 600;
        margin: 0.5em 0 0.25em 0;
        line-height: 1.2;
        color: #1a1a1a;
        border-bottom: 2px solid #e1e5e9;
        padding-bottom: 0.3em;
      }

      h2 {
        font-size: ${typo.h2.fontSize}px;
        font-family: ${typo.h2.fontFamily}, sans-serif;
        font-weight: 600;
        margin: 0.5em 0 0.25em 0;
        line-height: 1.3;
        color: #1a1a1a;
      }

      h3 {
        font-size: ${typo.h3.fontSize}px;
        font-family: ${typo.h3.fontFamily}, sans-serif;
        font-weight: 600;
        margin: 0.5em 0 0.25em 0;
        line-height: 1.4;
        color: #1a1a1a;
      }

      p {
        font-size: ${typo.p.fontSize}px;
        font-family: ${typo.p.fontFamily}, sans-serif;
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
      // Strip inline font-size from headings so our CSS sizes take effect
      const stripHeadingFontSizes = () => {
        editor.dom.select("h1,h2,h3").forEach((el) => {
          el.style.removeProperty("font-size");
          editor.dom.select("*", el).forEach((child) => {
            child.style.removeProperty("font-size");
          });
        });
      };

      editor.on("init", () => {
        stripHeadingFontSizes();
        editor.focus();
      });

      editor.on("FormatApply", ({ format }) => {
        if (["h1", "h2", "h3"].includes(format)) {
          setTimeout(stripHeadingFontSizes, 0);
        }
      });
    },
  };

  return (
    <Editor
      key={fontFormats} // Force re-render when fonts change
      apiKey="l1htx10scfunizdawurrb9j2njqukthv8eb30m6rr0r64177"
      value={content}
      onEditorChange={onContentChange}
      init={editorConfig}
    />
  );
}

export default TextEditor;
