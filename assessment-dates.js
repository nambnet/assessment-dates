(function(){
  var u = [
    'https://default42a9fcfcfb884e02a6ca0ea101af93',
    '.f1.environment.api.powerplatform.com:443',
    '/powerautomate/automations/direct/workflows/',
    'c552e3a5728d41e78ff832d459d48938',
    '/triggers/manual/paths/invoke?api-version=1',
    '&sp=%2Ftriggers%2Fmanual%2Frun',
    '&sv=1.0',
    '&sig=MqpdbqvMp4u7nuMGLn_HqmCla6R09F-b1VAZHqXwIu8'
  ].join('');

  var HIDE_PAST = true;

  // Excel serial number to date string (e.g. 46001 -> "December 10, 2025")
  var MONTHS = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  function serialToDate(val) {
    if (!val) return '';
    // If already a string with letters, return as-is
    if (typeof val === 'string' && val.match(/[a-zA-Z]/)) return val;
    var num = Number(val);
    if (isNaN(num)) return val;
    // Excel epoch: Jan 1, 1900 = serial 1 (with the leap year bug offset)
    var d = new Date(Date.UTC(1899, 11, 30 + num));
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }

  // Get retreat dates field - handle both "Retreat Dates" and "RetreatDates"
  function getField(row, name) {
    if (row[name] !== undefined) return row[name];
    var noSpace = name.replace(/ /g, '');
    if (row[noSpace] !== undefined) return row[noSpace];
    return '';
  }

  function parseEndDate(dateStr) {
    if (!dateStr) return null;
    var parts = dateStr.split(',');
    if (parts.length < 2) return null;
    var year = parts[parts.length - 1].trim();
    var datePart = parts[0].trim();
    var crossMonth = datePart.match(/\w+\s+\d+-(\w+)\s+(\d+)/);
    if (crossMonth) return new Date(crossMonth[1] + ' ' + crossMonth[2] + ', ' + year);
    var sameMonth = datePart.match(/(\w+)\s+\d+-(\d+)/);
    if (sameMonth) return new Date(sameMonth[1] + ' ' + sameMonth[2] + ', ' + year);
    return new Date(dateStr);
  }

  function render(data) {
    var el = document.getElementById('assessment-dates-content');
    var now = new Date();
    now.setHours(0, 0, 0, 0);

    var groups = {};
    var order = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var season = row.Season || 'Other';
      if (!groups[season]) {
        groups[season] = [];
        order.push(season);
      }
      groups[season].push(row);
    }

    var displayCols = ['Retreat Dates', 'Location', 'Registration Deadline', 'Region'];
    var frag = document.createDocumentFragment();

    for (var s = 0; s < order.length; s++) {
      var sn = order[s];
      var rows = groups[sn];

      if (HIDE_PAST) {
        var filtered = [];
        for (var j = 0; j < rows.length; j++) {
          var dateVal = getField(rows[j], 'Retreat Dates');
          var ed = parseEndDate(dateVal);
          if (ed && ed >= now) filtered.push(rows[j]);
        }
        rows = filtered;
      }

      if (rows.length === 0) continue;

      var heading = document.createElement('h3');
      heading.textContent = sn;
      frag.appendChild(heading);

      var wrapper = document.createElement('div');
      wrapper.className = 'table-responsive';
      var tbl = document.createElement('table');
      tbl.className = 'table table-bordered table-hover';
      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      for (var c = 0; c < displayCols.length; c++) {
        var th = document.createElement('td');
        th.textContent = displayCols[c];
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      tbl.appendChild(thead);

      var tbody = document.createElement('tbody');
      for (var k = 0; k < rows.length; k++) {
        var tr = document.createElement('tr');
        for (var c2 = 0; c2 < displayCols.length; c2++) {
          var cell = document.createElement('td');
          var val = getField(rows[k], displayCols[c2]);
          // Convert serial numbers for deadline column
          if (displayCols[c2] === 'Registration Deadline') {
            val = serialToDate(val);
          }
          cell.textContent = val || '';
          tr.appendChild(cell);
        }
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      wrapper.appendChild(tbl);
      frag.appendChild(wrapper);
    }

    if (frag.childNodes.length === 0) {
      var msg = document.createElement('p');
      msg.textContent = 'No upcoming retreat dates at this time. Please check back later.';
      frag.appendChild(msg);
    }

    el.appendChild(frag);
  }

  fetch(u)
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      document.getElementById('assessment-dates-loading').style.display = 'none';
      render(data);
    })
    .catch(function(e) {
      console.error('Assessment dates error:', e);
      document.getElementById('assessment-dates-loading').style.display = 'none';
      document.getElementById('assessment-dates-error').style.display = 'block';
    });
})();
