//**
//
// START HELPER FUNCTIONS
//
//**
var regexpat = /[^\d][(.|?|!)](?=\s|$)/mi // no global to enable, string.match to return index

function removeByIndex(str,index) {
  if (index==0) {
      return  str.slice(1)
  } else {
      return str.slice(0,index-1) + str.slice(index);
  }
}

function nthIndex(str, pat, n){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
}

function regexpatIndex(str){
    var matches = [];
    var i = 1
    var match;
    var strcpy = str
    while ( strcpy.match( regexpat ) !== null ){
      Logger.log( "i : " + i )
      match = strcpy.match( regexpat );
      match[ "index" ] = match[ "index" ] + 2;
      Logger.log("before: " + strcpy )
      Logger.log(match['index'])
      strcpy = removeByIndex( strcpy , match[ "index" ] );
      Logger.log("after: " + strcpy )
      Logger.log(match)
      matches.push( match['index']+i);
      i += 1
      Logger.log( matches );
      if (i > 10){
       return [];
      }

    }
    return matches;
}

//**
//
// END HELPER FUNCTIONS
//
//**




/**
 * @OnlyCurrentDoc
 *
 * The above comment directs Apps Script to limit the scope of file
 * access for this add-on. It specifies that this add-on will only
 * attempt to read or modify the files in which the add-on is used,
 * and not all of the user's files. The authorization request message
 * presented to users will reflect this limited scope.
 */

/**
 * Creates a menu entry in the Google Docs UI when the document is opened.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e)
{

  Logger.log( 'entering onOpen' );

  DocumentApp.getUi().createAddonMenu()
      .addItem( 'Start', 'showSidebar' )
      .addToUi();

  Logger.log( 'exiting onOpen' );

}



/**
 * Runs when the add-on is installed.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE.)
 */
function onInstall(e)
{

  Logger.log( 'entering onInstall' );

  onOpen(e);

  Logger.log( 'exiting onInstall' );

}

/**
 * Opens a sidebar in the document containing the add-on's user interface.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 */
function showSidebar()
{

  Logger.log( 'entering showSidebar' );

  var ui = HtmlService.createHtmlOutputFromFile( 'sidebar' )
      .setTitle( 'hint' );

  DocumentApp.getUi().showSidebar( ui );

  Logger.log( 'exiting showSidebar' );

}

/**
 * Gets the text the user has selected. If there is no selection,
 * this function displays an error message.
 *
 * @return {Array.<string>} The selected text.
 */
function getSelectedText()
{
  Logger.log( 'entering getSelectedText' );

  var selection = DocumentApp.getActiveDocument().getSelection();
  var text = [];

  if ( selection )
  {

    var elements = selection.getSelectedElements();

    for ( var i = 0; i < elements.length; ++i )
    {

      if ( elements[i].isPartial() )
      {

        var element = elements[i].getElement().asText();
        var startIndex = elements[i].getStartOffset();
        var endIndex = elements[i].getEndOffsetInclusive();

        text.push(element.getText().substring(startIndex, endIndex + 1));

      }
      else
      {

        var element = elements[i].getElement();

        // Only translate elements that can be edited as text; skip images and
        // other non-text elements.
        if ( element.editAsText )
        {

          var elementText = element.asText().getText();

          // This check is necessary to exclude images, which return a blank
          // text element.
          if ( elementText )
          {
            text.push(elementText);
          }

        }
      }
    }
  }

  if ( !text.length ) throw new Error( 'Please select some text.' );

  Logger.log('getSelectText return value is' + text);
  Logger.log('exiting getSelectedText');

  return text;

}

/**
 * Gets the stored user preferences for the origin and destination languages,
 * if they exist.
 * This method is only used by the regular add-on, and is never called by
 * the mobile add-on version.
 *
 * @return {Object} The user's origin and destination language preferences, if
 *     they exist.
 */
/*function getPreferences() {
  var userProperties = PropertiesService.getUserProperties();
  return {
    originLang: userProperties.getProperty('originLang'),
    destLang: userProperties.getProperty('destLang')
  };
}*/

/**
 * Gets the user-selected text and translates it from the origin language to the
 * destination language. The languages are notated by their two-letter short
 * form. For example, English is 'en', and Spanish is 'es'. The origin language
 * may be specified as an empty string to indicate that Google Translate should
 * auto-detect the language.
 *
 * @param {string} origin The two-letter short form for the origin language.
 * @param {string} dest The two-letter short form for the destination language.
 * @param {boolean} savePrefs Whether to save the origin and destination
 *     language preferences.
 * @return {Object} Object containing the original text and the result of the
 *     translation.
 */

function getTextandGiveHint()
{

  Logger.log( 'entering getTextandGiveHint' );


  var body = DocumentApp.getActiveDocument().getBody();
  var prompt = body.getText();


  Logger.log( 'getTextandGiveHint prompt is' + prompt );
  Logger.log( 'prompt length: ' + prompt.length );

  var suggestedText = "";

  if ( prompt.length < 180 )
  {
    suggestedText = "I'll be able to help you with a hint after you write a little more! Keep going and ask for a hint again once you are ready for inspiration.";
  }
  else
  {
    suggestedText = retrieveSuggestedTextFromAPI( prompt );
  }
  Logger.log( 'getTextandGiveHint text is' + suggestedText );
  Logger.log('exiting getTextandGiveHint');
  return { suggestion: suggestedText };
}

/**
 * Replaces the text of the current selection with the provided text, or
 * inserts text at the current cursor location. (There will always be either
 * a selection or a cursor.) If multiple elements are selected, only inserts the
 * translated text in the first element that can contain text and removes the
 * other elements.
 *
 * @param {string} newText The text with which to replace the current selection.
 */
function insertText( newText )
{

  Logger.log( 'entering newText' );

  var selection = DocumentApp.getActiveDocument().getSelection();

  if ( selection )
  {

    /*
    *
    *  hint insertion with text selection.
    *
    */

    var replaced = false;
    var elements = selection.getSelectedElements();

    if ( elements.length === 1 && elements[0].getElement().getType() === DocumentApp.ElementType.INLINE_IMAGE )
    {

      throw new Error('Can\'t insert hint into an image.');

    }

    for ( var i = 0; i < elements.length; ++i )
    {
      if ( elements[i].isPartial() )
      {

        var element = elements[i].getElement().asText();
        var startIndex = elements[i].getStartOffset();
        var endIndex = elements[i].getEndOffsetInclusive();

        element.deleteText(startIndex, endIndex);

        if ( !replaced )
        {

          element.insertText( startIndex, newText );
          replaced = true;

        }
        else
        {
          // This block handles a selection that ends with a partial element. We
          // want to copy this partial text to the previous element so we don't
          // have a line-break before the last partial.

          var parent = element.getParent();
          var remainingText = element.getText().substring( endIndex + 1 );
          parent.getPreviousSibling().asText().appendText( remainingText );

          // We cannot remove the last paragraph of a doc. If this is the case,
          // just remove the text within the last paragraph instead.
          if ( parent.getNextSibling() )
          {

            parent.removeFromParent();

          }
          else
          {

            element.removeFromParent();

          }
        }

      } else {

        var element = elements[i].getElement();
        if ( !replaced && element.editAsText )
        {

          // Only add hint to elements that can be edited as text, removing other
          // elements.
          element.clear();
          element.asText().setText(newText);
          replaced = true;

        }
        else
        {

          // We cannot remove the last paragraph of a doc. If this is the case,
          // just clear the element.
          if ( element.getNextSibling() )
          {

            element.removeFromParent();

          }
          else
          {

            element.clear();

          }
        }
      }
    }
  } else {


    /*
    *
    * hint insertion with no text selection, just a cursor position.
    *
    */

    var cursor = DocumentApp.getActiveDocument().getCursor();
    var surroundingText = cursor.getSurroundingText().getText();
    Logger.log("surroundingText is: " + surroundingText);

    var surroundingTextOffset = cursor.getSurroundingTextOffset();
    Logger.log("surroundingTextOffset is: " + surroundingTextOffset);

    // If the cursor follows or preceds a non-space character, insert a space
    // between the character and the hint. Otherwise, just insert the
    // hint.

    if ( surroundingTextOffset > 0 )
    {
      if ( surroundingText.charAt(surroundingTextOffset - 1) != ' ' )
      {

        newText = ' ' + newText;

      }
    }

    if ( surroundingTextOffset < surroundingText.length )
    {

      if ( surroundingText.charAt(surroundingTextOffset) != ' ' )
      {

        newText += ' ';

      }

    }

    cursor.insertText( newText );

    Logger.log( 'newText newText is' + newText );

  }

  Logger.log( 'exiting newText' );

}

/**
 * Given text, translate it from the origin language to the destination
 * language. The languages are notated by their two-letter short form. For
 * example, English is 'en', and Spanish is 'es'. The origin language may be
 * specified as an empty string to indicate that Google Translate should
 * auto-detect the language.
 *
 * @param {string} text text to translate.
 * @param {string} origin The two-letter short form for the origin language.
 * @param {string} dest The two-letter short form for the destination language.
 * @return {string} The result of the translation, or the original text if
 *     origin and dest languages are the same.
 */
/*function translateText(text, origin, dest) {
  if (origin === dest) return text;
  return LanguageApp.translate(text, origin, dest);
}*/


function retrieveSuggestedTextFromAPI(prompt)
{
  Logger.log('entering retrieveSuggestedTextFromAPI');
  var url = 'http://ae7dafded316511eab1fb0eb612f22d6-278490164.us-west-2.elb.amazonaws.com/hint/api-v0';

  var data =
  {
    'text': prompt
  }

  var options =
  {
    'method' : 'post',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(data)
  };

  var responseText = JSON.parse(UrlFetchApp.fetch(url, options).getContentText("UTF-8"));

  Logger.log('retrieveSuggestedTextFromAPI response is ' + responseText);

  var responseNoPrompt = responseText.replace(prompt,'');

  Logger.log('retrieveSuggestedTextFromAPI response after subtraction of prompt is ' + responseNoPrompt);

    cutEOTIndex = nthIndex(responseNoPrompt, "<|endoftext|>", 1);
  if ( cutEOTIndex !== -1 )
  {
    responseNoPrompt = responseNoPrompt.substring( 0 , cutEOTIndex);
  }

  cutIndexArray = regexpatIndex(responseNoPrompt);

  // if the array length of periods is less than 2, then return whole response.
  if (cutIndexArray.length < 2)
  {
    Logger.log('return full response');
    return responseNoPrompt;
  }
  else
  {
    Logger.log('return short response : ' + responseNoPrompt.substring( 0, cutIndexArray[1] ));
    return responseNoPrompt.substring( 0, cutIndexArray[1] );
  }
}
