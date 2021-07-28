// https://developers.google.com/datastudio/connector/reference#getconfig
function getConfig() {
  var config = cc.getConfig();

  config
    .newInfo()
    .setId('instructions')
    .setText(
      'Enter npm package names to fetch their download count. An invalid or blank entry will revert to the default value.'
    );

  config
    .newTextInput()
    .setId('package')
    .setName(
      'Enter a single package name or multiple names separated by commas (no spaces!)'
    )
    .setHelpText('e.g. "googleapis" or "package,somepackage,anotherpackage"')
    .setPlaceholder(DEFAULT_PACKAGE)
    .setAllowOverride(true);

  config.setDateRangeRequired(true);

  return config.build();
}


function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;  

  fields
    .newDimension()
    .setId('lastUpdatedDateTime')
    .setName('LastUpdatedDateTime')
    .setType(types.YEAR_MONTH_DAY_MINUTE);
  

  return fields;
}

// https://developers.google.com/datastudio/connector/reference#getschema
function getSchema(request) {
  return {schema: getFields().build()};
}


function getData(request) {
  request.configParams = validateConfig(request.configParams);

  var requestedFields = getFields().forIds(
    request.fields.map(function(field) {
      return field.name;
    })
  );

  try {
    var apiResponse = fetchDataFromApi(request);
    var normalizedResponse = normalizeResponse(request, apiResponse);
    var data = getFormattedData(normalizedResponse, requestedFields);
  } catch (e) {
    cc.newUserError()
      .setDebugText('Error fetching data from API. Exception details: ' + e)
      .setText(
        'The connector has encountered an unrecoverable error. Please try again later, or file an issue if this error persists.'
      )
      .throwException();
  }

  return {
    schema: requestedFields.build(),
    rows: data
  };
}

/**
 * Gets response for UrlFetchApp.
 *
 * @param {Object} request Data request parameters.
 * @returns {string} Response text for UrlFetchApp.
 */
function fetchDataFromApi(request) {
  var url = [
    'https://www.bitstamp.net/api/ticker',
    '',
    '',
    '',
    '/',
    ''
  ].join('');
  var response = UrlFetchApp.fetch(url);
  return response;
}

/**
 * Parses response string into an object. Also standardizes the object structure
 * for single vs multiple packages.
 *
 * @param {Object} request Data request parameters.
 * @param {string} responseString Response from the API.
 * @return {Object} Contains package names as keys and associated download count
 *     information(object) as values.
 */
function normalizeResponse(request, responseString) {
  var response = JSON.parse(responseString);
  var package_list = request.configParams.package.split(',');
  var mapped_response = {};

  if (package_list.length == 1) {
    mapped_response[package_list[0]] = response;
  } else {
    mapped_response = response;
  }

  return mapped_response;
}

/**
 * Formats the parsed response from external data source into correct tabular
 * format and returns only the requestedFields
 *
 * @param {Object} parsedResponse The response string from external data source
 *     parsed into an object in a standard format.
 * @param {Array} requestedFields The fields requested in the getData request.
 * @returns {Array} Array containing rows of data in key-value pairs for each
 *     field.
 */
function getFormattedData(response, requestedFields) {
  var data = [];
  Object.keys(response).map(function(packageName) {
    var package = response[packageName];
    var downloadData = package.downloads;
    var formattedData = downloadData.map(function(dailyDownload) {
      return formatData(requestedFields, packageName, dailyDownload);
    });
    data = data.concat(formattedData);
  });
  return data;
}




