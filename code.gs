//**
// 
// START HELPER FUNCTIONS
//
//**

var HINTAPIURL = "http://aaae98055559711eaa7410a53d2d7c0e-391595921.us-west-2.elb.amazonaws.com/hint-api-v0"
var HINTDBAPIURL = "https://webhooks.mongodb-stitch.com/api/client/v2.0/app/api-gdocs-spypg/service/data/incoming_webhook/add-data"
var HINTDBSECRET = "2CZkDA3C5cFSMGxCMTu8zXsgr88P3R"
var CURRENTCATEGORY = "unset"
var MOSTRECENTHINTID = ""

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
      // Logger.log( "i : " + i )
      match = strcpy.match( regexpat );
      match[ "index" ] = match[ "index" ] + 2;
      strcpy = removeByIndex( strcpy , match[ "index" ] );
      matches.push( match['index']+i);
      i += 1
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

  DocumentApp.getUi().createAddonMenu().addItem( 'Start', 'showSidebar' ).addToUi();

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

  var EditorArray = DocumentApp.getActiveDocument().getEditors();
  var docuid = DocumentApp.getActiveDocument().getId();
  var doctitle = DocumentApp.getActiveDocument().getName();
  var doctext = DocumentApp.getActiveDocument().getBody().getText();

  var date_today = new Date();
  var today_year = date_today.getFullYear();
  var today_month = ("0" + (date_today.getMonth() + 1)).slice(-2);
  var today_day = ("0" + date_today.getDate()).slice(-2);
  var datestring = today_year + '-' + today_month + '-' + today_day;

  var editorList = [];

  for ( var i = 0; i < EditorArray.length; i++ )
  {
    editorList.push(EditorArray[i].getEmail())
    // Iterate over numeric indexes from 0 to length, as everyone expects.

    if (EditorArray[i].getEmail().indexOf("hintwriting.com") === -1) // https://stackoverflow.com/a/47486826/3700836
    {
      var formData = {
        'entry.419624731' : EditorArray[i].getEmail(), //email
        'entry.352867374' : docuid, // docuid
        'entry.501922370' : datestring
      };
      var options = {
        'method' : 'post',
        'payload' : formData
      };

      UrlFetchApp.fetch('https://docs.google.com/forms/d/e/1FAIpQLScud92qQahNkNZaeF1X4fS_rglVbF3NSCTy_AL4ZrQHWmJoug/formResponse', options);

    }
  }


  var params = {
    "secret" : HINTDBSECRET,
    "task" : "document",
    }

  var data =
  {
    "gdocsid" : docuid,
    "user" : Session.getActiveUser().getEmail(),
    "editors" : editorList.join(","),
    "fulltext" : doctext
  }

  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(data)
  }

  // Updated db in play
  var queryString = Object.keys(params).map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
  }).join('&');

  var response = UrlFetchApp.fetch(HINTDBAPIURL + "?" + queryString, options).getContentText("UTF-8"); // no need for JSON.parse() as we are not expecting json, or anything right now


  var ui = HtmlService.createHtmlOutputFromFile( 'sidebar' )
      .setTitle( ' ' ); // previously `hint` but logo already appears

  DocumentApp.getUi().showSidebar( ui );


  Logger.log( 'exiting showSidebar' );

}


/**
 * Gets category from user submission and sends to google forms
**/
function submitCatergory (categoryString) {

  var docuid = DocumentApp.getActiveDocument().getId();
  var EditorArray = DocumentApp.getActiveDocument().getEditors();

  var date_today = new Date();
  var today_year = date_today.getFullYear();
  var today_month = ("0" + (date_today.getMonth() + 1)).slice(-2);
  var today_day = ("0" + date_today.getDate()).slice(-2);
  var datestring = today_year + '-' + today_month + '-' + today_day;

  if (EditorArray[0].getEmail().indexOf("hintwriting.com") === -1) // https://stackoverflow.com/a/47486826/3700836
  {
    var formData = {
      'entry.136409957' : categoryString,
      'entry.419624731' : EditorArray[0].getEmail(), //email
      'entry.352867374' : docuid, // docuid
      'entry.501922370' : datestring
    };
    var options = {
      'method' : 'post',
      'payload' : formData
    };

    UrlFetchApp.fetch('https://docs.google.com/forms/d/e/1FAIpQLSck_5piXaBnnwymRtJciOlKGelzGecS_h_tyZnu5hFWpTra9Q/formResponse', options);
  }

  var options = {
    'method' : 'post'
  }
  var params =
      {
        "secret" : HINTDBSECRET,
        "task" : "category",
        "gdocsid" : docuid,
        "category": categoryString,
        "user" : Session.getActiveUser().getEmail()
      }

  // Updated db in play
  var queryString = Object.keys(params).map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
  }).join('&');

  UrlFetchApp.fetch(HINTDBAPIURL + "?" + queryString, options);

}


/**
 * Adds the rejected hint to the db
 * 
 * 
 */

 function rejectHint (hintid)
 {
   Logger.log('entering reject hint with id: ' + hintid)

  var docuid = DocumentApp.getActiveDocument().getId();

  var data  =
      {
        
        "gdocsid" : docuid,
        "hintid" : hintid,
        "category" : CURRENTCATEGORY,
        "user" : Session.getActiveUser().getEmail()

      }
  
  var params = {
    "secret" : HINTDBSECRET,
     "task" : "reject",
  }
  
  var options =
  {
    'method' : 'post',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(data)
  };
 
  // Updated db in play
  var queryString = Object.keys(params).map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
  }).join('&');

  var response = UrlFetchApp.fetch(HINTDBAPIURL + "?" + queryString, options).getContentText("UTF-8"); // no need for JSON.parse() as we are just returning the id
  Logger.log('finsihed reject hint')

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


  /*
  * Simple cursor capture v0 2020-02-10
  *
  * Capture cursor paragraph, if too short use all of the body text (up to a length that prevents API from freaking out)
  * to improve: ideally if the para is too short, this function would use other nearby paragraphs for context - currently it just uses the last part of the body text.
  */

  var cursor = DocumentApp.getActiveDocument().getCursor();
  var surroundingText = cursor.getSurroundingText().getText();
  Logger.log("surroundingText is: " + surroundingText);

  var prompt = surroundingText;

  if( prompt.length < 180 )
  {
    Logger.log("prompt too short");
    var bodyText = DocumentApp.getActiveDocument().getBody().getText();

    Logger.log(bodyText.length)
    if( bodyText.length > 1000 )
    {
      Logger.log("adjust length of prompt")
      prompt = bodyText.slice( bodyText.length - 1000 );
    }
    else
    {
      prompt = bodyText
    }
  }


  Logger.log( 'getTextandGiveHint prompt is' + prompt );
  Logger.log( 'prompt length: ' + prompt.length );

  var suggestedText = "";
  var nohint = false;

  if ( prompt.length < 180 )
  {
    suggestedText = "I'll be able to help you with a hint after you write a little more! Keep going and ask for a hint again once you are ready for inspiration.";
    nohint = true;
  }
  else
  {
    suggestedText = retrieveSuggestedTextFromAPI( prompt );
  }

  var docuid = DocumentApp.getActiveDocument().getId();

  var data  =
      {
        
        "gdocsid" : docuid,
        "hinttext": suggestedText,
        "submittedtext" : prompt,
        "category" : CURRENTCATEGORY,
        "user" : Session.getActiveUser().getEmail()
      }
  
  var params = {
    "secret" : HINTDBSECRET,
     "task" : "hint",
  }
  
  var options =
  {
    'method' : 'post',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(data)
  };
 
  // Updated db in play
  var queryString = Object.keys(params).map((key) => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
  }).join('&');

  var response = UrlFetchApp.fetch(HINTDBAPIURL + "?" + queryString, options).getContentText("UTF-8"); // no need for JSON.parse() as we are just returning the id
  
  // Logger.log( 'getTextandGiveHint text is' + suggestedText );
  // Logger.log( 'hint id is ' + response);
  Logger.log('exiting getTextandGiveHint');

  return { suggestion: suggestedText , nohint: nohint , hintid : response };
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

  // clean new text fof aditional spaces
  newText = newText.trim()

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

  var responseText = JSON.parse(UrlFetchApp.fetch(HINTAPIURL, options).getContentText("UTF-8"));

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
