var id;
var accounts;
var name;
var account;
var tickets;
var alrt;
var num_events;
var ticketChain;
var events = {};
var scanned = [];
var WEI_CONVERSION = 10000000000000000;
var TICKETS_LEFT_TEXT = 20;
var POPUP_TIMEOUT = 2000;
var TRANSAC_FEE = 10000;
var RESALE_LIMIT = 1.5;


/**** REFRESH FUNCTIONS ****/

// Main refresh (starts chain)
function refresh() {
  refreshEvents();
}

// Refresh events (calls refreshMarket/refreshUser)
function refreshEvents() {
  ticketChain.getNumEvents.call().then(function(count) {
    num_events = count;
    for (var i = 0; i < count; i++)
      fetchEvent(i, count);
    return true;
  }).catch(function(e) {
    error(e);
  });
}

// Refresh market listing (calls refreshEventTickets)
function refreshMarket() {
  // Show empty text
  if (!$.contains(document, $('#market tbody .empty')[0])) {
    $("#market tbody").empty();
    $('#market tbody').append('<tr><td class="empty" colspan="3">' +
      'There are no tickets on the market.</td></tr>');
  }
  for (var i = 0; i < num_events; i++)
    for (var j = 0; j < events[i][5].length; j++)
      fetchTicket(events[i][5][j].valueOf(), '#market');
}

// Refresh user (calls refreshUserTickets)
function refreshUser() {
  tickets = [];
  ticketChain.getUser.call({
    from: account
  }).then(function(resp) {
    name = resp[0];
    tickets = resp[1];
    if(window.location.pathname !== '/scan/')
      $('#yourBalance').html('Balance: ' + showBalance());
    refreshUserTickets();
    return true;
  }).catch(function(e) {
    error(e);
  });
}

// Refresh user tickets
function refreshUserTickets() {
  $("#userTickets tbody").empty();
  for (var i = 0; i < tickets.length; i++)
    fetchTicket(tickets[i].valueOf(), '#userTickets');
  if (tickets.length == 0)
    $('#userTickets tbody').append('<tr><td class="empty" colspan="3">' +
      'You haven\'t purchased a ticket yet.</td></tr>');
}


/**** FETCH FUNCTIONS ****/

// Fetch ticket
function fetchTicket(ticket_id, elem, actions) {
  ticketChain.getTicket.call(ticket_id).then(function(ticket) {
    var buttons = "";
    var event_name = events[ticket[1].valueOf()][1];

    // Check if on market
    if (ticket[3] && ticket[0] == account) {
      buttons = '<button class="btn btn-default" onclick="cancelSale(' + ticket_id + ')">Cancel<span class="hidden-xs"> Sale</span></button>';
    } else {
      // Show appropriate buttons
      if (elem == "#market")
        buttons = '<button class="btn btn-default" onclick="buyTicket(' + ticket[1].valueOf() + ', \'' + event_name +
        '\', ' + parseInt(ticket[2].valueOf()) + ', ' + ticket_id + ')">Buy<span class="hidden-xs"> Ticket</span></button>';
      else if (elem == "#userTickets")
        buttons = '<button class="btn btn-default" onclick="sellTicket(' + ticket_id + ', \'' + event_name +
        '\', ' + parseInt(ticket[2].valueOf()) + ')">Sell <span class="hidden-xs">Ticket</span></button>' +
        '<button class="btn btn-default qr-code" onclick="openPrint(' + ticket_id + ', ' 
        + ticket[1].valueOf() + ', \'' + event_name + '\')">QR Code</button>';
    }
    // Add to table
    if (elem == "#market") {
      if ($.contains(document, $('#market tbody .empty')[0]))
        $("#market tbody").empty();
      addTableRow(elem, 'ticket-' + ticket_id, ['<img src="/images/icons/icon-ticket.png" class="ticket-icon" /> ' +
        '<span class="ticket-event-name">' + event_name + '</span>', showPrice(ticket[2].valueOf()), buttons
      ]);
    } else if (elem == '#userTickets')
      addTableRow(elem, 'ticket-' + ticket_id, ['<img src="/images/icons/icon-ticket.png" class="ticket-icon" /> ' +
        '<span class="ticket-event-name">' + event_name + '</span>', showPrice(ticket[2].valueOf()), buttons
      ]);
    return true;
  }).catch(function(e) {
    error(e);
  });
}

// Fetch event
function fetchEvent(event_id, total) {
  ticketChain.getEvent.call(event_id).then(function(item) {
    if (events[event_id] === undefined)
      addEvent('#availableEvents', event_id, item[1], item[2].valueOf());
    // Check if sold out
    var sold_out = parseInt(item[4].valueOf()) >= parseInt(item[3].valueOf());
    $('#event-' + event_id).toggleClass('sold-out', sold_out);
    $('#event-' + event_id + ' .btn').attr("disabled", sold_out);
    // Show low tickets left
    var tickets_left = parseInt(item[3].valueOf()) - parseInt(item[4].valueOf());
    if (tickets_left <= TICKETS_LEFT_TEXT)
      $('#event-' + event_id + ' .tickets-left').text(tickets_left +
        ' ticket' + (tickets_left == 1 ? '' : 's') + ' left!');
    // Update stored details
    events[event_id] = item;

    // Load market/tickets after last event
    if (event_id == total - 1) {
      // Hide loading screen if not validator
      if (alrt) {
        swal(alrt,
          function() {},
          function(dismiss) {}
        );
        alrt = null;
      } else if ($('.swal2-title').text() == 'Loading...')
        swal.close();
      // Show validation result if requested
      if (getUrlParameter('func') == "validate")
        validateTicket(getUrlParameter('code'));
      else {
        refreshMarket();
        refreshUser();
      }
    }
    return true;
  }).catch(function(e) {
    error(e);
  });
}


/**** BUTTON FUNCTIONS ****/

// Buy ticket
function buyTicket(event_id, event_name, price, ticket_id) {
  var on_market = ticket_id !== undefined;
  ticket_id = on_market ? ticket_id : 0;
  price += TRANSAC_FEE;
  swal({
    title: "Ticket Purchase",
    html: '<br />1 x ' + event_name + ' ticket for <strong>' + showPrice(price) + '</strong>' +
      '<div class="panel panel-default payment-panel">' +
      '<div class="panel-heading">' +
      '<div class="row">' +
      '<div class="col-xs-8 col-md-6 panel-title">Payment Details</div>' +
      '<div class="col-xs-4 col-md-6 panel-icons"><img class="pull-right cards" src="/images/icons/icon-colouredcards.png"></div>' +
      '</div>' +
      '</div>' +
      '<div class="panel-body">' +
      '<div class="row">' +
      '<div class="col-xs-12"><div class="form-group">' +
      '<label>CARD NUMBER</label><div class="input-group">' +
      '<input type="tel" class="form-control" value="4242 4242 4242 4242" disabled>' +
      '<span class="input-group-addon"><img class="card-icon" src="/images/icons/icon-card.png"></span>' +
      '</div></div>' +
      '</div>' +
      '</div>' +
      '<div class="row">' +
      '<div class="col-xs-7"><div class="form-group">' +
      '<label>EXP DATE</label><input type="tel" class="form-control" value="01/18" disabled>' +
      '</div></div>' +
      '<div class="col-xs-5 pull-right"><div class="form-group">' +
      '<label>CV CODE</label><input type="tel" class="form-control" value="123" disabled>' +
      '</div></div>' +
      '<div class="col-xs-5 pull-right"><img class="stripe pull-right" src="/images/stripe-logo.png"></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      'Click Confirm to complete your purchase.',
    customClass: 'swal-ticket-purchase',
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Back',
    showCancelButton: true
  }).then(function() {
    showLoading();
    send(ticketChain.buyTicket, [event_id, ticket_id, on_market, {
        from: account,
        value: price
      }],
      function(resp) {
        setStatus("Transaction complete!");
        alrt = {
          title: "Success!",
          text: "You just bought a ticket to " + event_name +
            " for " + showPrice(price - TRANSAC_FEE) + "!",
          type: "success",
          showConfirmButton: false,
          timer: POPUP_TIMEOUT
        };
        refresh();
        return true;
      },
      "An error occurred. " + (on_market ? "This ticket might already be sold." :
        "This event might be sold out.")
    );
    return true;
  });
}

// Sell ticket
function sellTicket(ticket_id, event_name, orig_price) {
  swal({
    title: "Sell Ticket",
    text: "Enter a resale price for your " + event_name + " ticket.",
    input: "text",
    showCancelButton: true,
    inputValidator: function(input) {
      return new Promise(function(resolve, reject) {
        var max_price = orig_price * RESALE_LIMIT;
        if (input === "" || isNaN(input) ||
          parseInt(input) < 0 || input.length > 10)
          reject("Amount invalid! Please try again.");
        if (parseInt(input) > (max_price / WEI_CONVERSION))
          reject('Ticket resale is limited to a ' + ((RESALE_LIMIT - 1) * 100) +
            '% markup (' + showPrice(max_price) + ')');
        resolve();
      })
    }
  }).then(
    function(input) {
      showLoading();
      send(ticketChain.sellTicket, [ticket_id, parseInt(input) * WEI_CONVERSION, {
          from: account
        }],
        function() {
          setStatus("Transaction complete!");
          alrt = {
            title: "Success!",
            text: "Your ticket is now on the market for " +
              showPrice(parseInt(input) * WEI_CONVERSION) + ".",
            type: "success",
            showConfirmButton: false,
            timer: POPUP_TIMEOUT
          };
          refresh();
          return true;
        }
      );
      return true;
    }
  );
}

// Cancel ticket
function cancelSale(ticket_id) {
  showLoading();
  send(ticketChain.cancelSale, [ticket_id, {
      from: account
    }],
    function() {
      setStatus("Transaction complete!");
      alrt = {
        title: "Alright!",
        text: "Your ticket was taken off the market.",
        type: "success",
        showConfirmButton: false,
        timer: POPUP_TIMEOUT
      };
      refresh();
      return true;
    }
  );
}

// Validate ticket
function validateTicket(ticket_code) {
  var ticket_code_split = ticket_code.split(':');

  // Get split code parameters
  var owner = ticket_code_split[0];
  var ticket_id = ticket_code_split[1];
  var event_id = ticket_code_split[2];
  var event_name = events[event_id][1];

  // Validate ticket call
  ticketChain.validateTicket.call(ticket_id, owner).then(function(resp) {
    var is_valid = resp[1];
    var owner_name = resp[0];
    // Check if valid
    if (is_valid)
      swal({title: "Ticket Valid", 
        html: '<br /><img src="/images/icons/icon-ticket.png" class="ticket-icon" /> <strong>'
        + event_name + '</strong><br /><br />Ticket #' + ticket_id, 
        type: "success"
      });
    else
      swal({title: "Ticket Invalid", 
        html: '<br /><img src="/images/icons/icon-ticket.png" class="ticket-icon" /> <strong>'
        + event_name + '</strong><br /><br />This ticket is no longer valid', 
        type: "error"
      });
    // Remove params from URL
    if(window.history != undefined && window.history.pushState != undefined)
      window.history.replaceState({}, document.title, window.location.pathname);
    // Add to list of scanned tickets
    var ticket_details = ['<span class="ticket-' + (is_valid ? 'valid' : 'invalid') 
      + '"></span>', '<img src="/images/icons/icon-ticket.png" class="ticket-icon" /> '
      + '<span class="ticket-event-name">' + event_name + '</span> (Ticket #' + ticket_id + ')', owner_name];
    addTableRow('#scannedTickets', 'ticket-' + ticket_id, ticket_details, true);
    // Update scanned tickets local storage
    scanned.push(ticket_details);
    localStorage.setItem('scanned', JSON.stringify(scanned));
    return true;
  }).catch(function(e) {
    error(e);
  });
}


/**** CREATE FUNCTIONS ****/

// Create event
function newEvent() {
  var name = document.getElementById("event_name").value;
  var price = parseInt(document.getElementById("event_price").value) * WEI_CONVERSION;
  var num_tickets = parseInt(document.getElementById("event_num_tickets").value);

  send(ticketChain.newEvent, [name, price, num_tickets, {
      from: account
    }],
    function(resp) {
      setStatus("Transaction complete!");
      refresh();
      return true;
    }
  );
}

// Create user
function newUser(name) {
  swal({
      title: "Hi " + name + "!",
      html: "<br /><br />Welcome to <strong>TicketChain</strong>.",
      confirmButtonText: "Let's Go!",
      timer: POPUP_TIMEOUT
    },
    function() {},
    function(dismiss) {}
  );
  send(ticketChain.newUser, [name, {
      from: account
    }],
    function(resp) {
      setStatus("Transaction complete!");
      $("#yourName").html(name);
      // Initial refresh (if new)
      refresh();
      return true;
    }
  );
}


/**** HELPER FUNCTIONS ****/

// Send transaction
function send(endpoint, vars, callback, error_msg) {
  setStatus("Initiating transaction... (please wait)");
  endpoint.estimateGas.apply(this, vars).then(function(gas) {
    vars[vars.length - 1].gas = gas * 2;
    endpoint.apply(this, vars).then(function(val) {
      return callback(val);
    }).catch(function(e) {
      error(e);
    });
    return true;
  }).catch(function(e) {
    error(e, error_msg);
  });
}

// Add item to events
function addEvent(elem, event_id, name, price) {
  var event = $('<div>').attr('class', 'event col-sm-6 col-md-3').attr('id', 'event-' + event_id);
  $(elem).append(event);
  event.html('<div class="image"><img src="/images/events/' + name + '.png"><img class="sold-out-img" src="/images/sold-out.png"><div class="details"><h3>' +
    name + '</h3><div class="price"><span class="price-text">' + showPrice(price) + '</span><span class="tickets-left"></span></div><button class="btn btn-default" onclick="buyTicket(' +
    +event_id + ', \'' + name + '\', ' + parseInt(price) + ')">Buy</button></div></div>');
}

// Add item to table
function addTableRow(elem, item_id, attrs, prepend) {
  var tr = $('<tr>').attr('id', item_id);
  tr.addClass('ticket');
  if(prepend)
    $(elem).prepend(tr);
  else
    $(elem).append(tr);
  for (var attr of attrs)
    tr.append($('<td>').html(attr));
}

// Show loading popup
function showLoading() {
  swal({
    title: 'Loading...',
    html: '<img src="/images/loading.gif" height="100" width="100">',
    showConfirmButton: false
  });
}

// Open ticket validator
function openValidator(ticket_id) {
  swal({
    title: 'Ticket Validator',
    html: 'This verifies a digital ticket with <em>TicketChain</em>.<br />Install an app below and tap <strong>Open Scanner</strong>.<br /><br />' +
      '<a href="https://play.google.com/store/apps/details?id=com.google.zxing.client.android" target="_blank"><img src="/images/playstore-logo.png"></a> ' +
      '<a href="https://itunes.apple.com/ie/app/qrafter-qr-code-reader-generator/id416098700" target="_blank"><img src="/images/appstore-logo.svg"></a><br />' +
      '<strong>Barcode Scanner</strong></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
      '<strong>Qrafter</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;',
    confirmButtonText: "Open Scanner",
    cancelButtonText: "Back",
    showCancelButton: true
  }).then(function() {
    window.open("/scan?id=" + id);
  });
  return false;
}

// Open print screen
function openPrint(ticket_id, event_id, event_name) {
  window.open('ticket/?t=' + ticket_id + ':' + event_id + ':' + event_name + ':' + account + ':' + name, 
    'print', 'width=400, height=535');
  return false;
}

// Get parameter from URL
function getUrlParameter(input) {
  var vars = decodeURIComponent(window.location.search.substring(1)).split('&'),
    param;
  for (var i = 0; i < vars.length; i++) {
    param = vars[i].split('=');
    if (param[0] === input)
      return param[1] === undefined ? true : param[1];
  }
}

// Set status text
function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
}

// Choose random ID
function getRandomId() {
  var num = Math.floor(Math.random() * 499) + 2;
  localStorage.setItem('account', num);
  return num;
}

// Return parsed balance
function showBalance() {
  return '\u20AC' + (web3.eth.getBalance(account) / WEI_CONVERSION).toLocaleString() + '.00';
}

// Return parsed price
function showPrice(price) {
  return price == 0 ? 'Free' : '\u20AC' + Math.floor(price / WEI_CONVERSION) + '.00';
}

// Check if admin
function isAdmin() {
  return window.location.pathname == '/admin/' ? 1 : null;
}

// Log error
function error(e, error_msg) {
  console.log(e);
  swal({
      title: "Oops!",
      text: error_msg ? error_msg : "An error occurred. Please try again.",
      type: "error",
      showConfirmButton: false,
      timer: POPUP_TIMEOUT
    },
    function() {},
    function(dismiss) {}
  );
  setStatus("An error occured.");
}

/**** MAIN WINDOW ONLOAD EVENT ****/

window.onload = function() {
  swal.setDefaults({
    reverseButtons: true
  });
  showLoading();
  web3.eth.getAccounts(function(err, accounts) {
    ticketChain = TicketChain.deployed();

    // Error checks
    if (err != null)
      alert("There was an error connecting to the Blockchain.");
    if (accounts.length == 0)
      alert("Couldn't get any Blockchain accounts! Please try again later.");

    // Set account parameters
    id = getUrlParameter('id') || isAdmin() || localStorage.getItem('account') || getRandomId();
    account = accounts[id];
    web3.eth.defaultAccount = account;

    // Get saved scanned tickets
    scanned = JSON.parse(localStorage.getItem('scanned')) || [];
    for(var i = scanned.length - 1; i >= 0; i--)
      addTableRow('#scannedTickets', 'ticket-' + scanned[i][1], scanned[i]);

    // Check user exists and refresh users
    ticketChain.getUser.call({
      from: account
    }).then(function(resp) {
      if (resp[0] == "") {
        if (isAdmin() === 1)
          newUser("Admin");
        else
          swal({
            title: "Welcome!",
            text: "Please enter your name below.",
            input: "text",
            allowOutsideClick: false,
            inputValidator: function(input) {
              return new Promise(function(resolve, reject) {
                if (input === "")
                  reject("Please enter a valid name.");
                if (!input.match(/^[0-9a-zA-Z-_ ]+$/))
                  reject("Please enter a name with valid letters.");
                resolve();
              })
            }
          }).then(function(input) {
            newUser(input);
          });
      } else {
        // Set user params
        $("#yourName").html(resp[0]);
        tickets = resp[1];
        // Initial refresh (if existing)
        refresh();
      }
      return true;
    }).catch(function(e) {
      error(e);
    });

    // Show account balance
    if(window.location.pathname !== '/scan/')
      $('#yourBalance').html('Balance: ' + showBalance());
  });
}
