var id;
var accounts;
var account;
var tickets;
var events;
var alrt;
var ticketChain;


/**** REFRESH FUNCTIONS ****/

// Main refresh (starts chain)
function refresh() {
  refreshEvents();
}

// Refresh events
function refreshEvents() {
  events = [];
  $("#availableEvents tbody").empty();
  ticketChain.getNumEvents.call().then(function(count) {
    for (var i = 0; i < count; i++)
      fetchEvent(i, count);
    return true;
  }).catch(function(e) {
    error(e);
  });
}

// Refresh market listing
function refreshMarket() {
  $("#market tbody").empty();
  for (var i = 0; i < events.length; i++)
    refreshEventTickets(events[i], '#market');
}

// Refresh event tickets
function refreshEventTickets(event, elem) {
  for (var i = 0; i < event.data[5].length; i++)
    fetchTicket(event.data[5][i].valueOf(), elem);
}

// Refresh user
function refreshUserTickets() {
  tickets = [];
  ticketChain.getUser.call({
    from: account
  }).then(function(resp) {
    tickets = resp[1];
    refreshMyTickets();
    return true;
  }).catch(function(e) {
    error(e);
  });
}

// Refresh user tickets
function refreshMyTickets() {
  $("#myTickets tbody").empty();
  for (var i = 0; i < tickets.length; i++)
    fetchTicket(tickets[i].valueOf(), '#myTickets');
}


/**** FETCH FUNCTIONS ****/

// Fetch ticket
function fetchTicket(ticket_id, elem, actions) {
  ticketChain.getTicket.call(ticket_id).then(function(ticket) {
    var buttons = "";
    var event_name = events[ticket[1].valueOf()].data[1];

    // Check if on market
    if (ticket[3] && ticket[0] == account) {
      buttons = '<button class="btn" onclick="cancelSale(' + ticket_id + ')">Cancel Sale</button>';
    } else {
      // Show appropriate buttons
      if (elem == "#market")
        buttons = '<button class="btn" onclick="buyTicket(' + ticket[1].valueOf() + ', ' +
        parseInt(ticket[2].valueOf()) + ', ' + ticket_id + ')">Buy Ticket</button>';
      else if (elem == "#myTickets")
        buttons = '<button class="btn" onclick="sellTicket(' + ticket_id + ')">Sell Ticket</button>' +
        '<button class="btn" onclick="openPrint(' + ticket_id + ')">View Code</button>';
    }
    // Add to table
    if (elem == "#market")
      tableAdd(elem, ticket_id, [event_name, showPrice(ticket[2].valueOf()), buttons]);
    else if (elem == '#myTickets')
      tableAdd(elem, ticket_id, [event_name, showPrice(ticket[2].valueOf()), buttons]);
    return true;
  }).catch(function(e) {
    error(e);
  });
}

// Fetch event
function fetchEvent(event_id, total) {
  ticketChain.getEvent.call(event_id).then(function(item) {
    tableAdd('#availableEvents', event_id, [item[1], showPrice(item[2].valueOf()), item[3].valueOf(),
      item[4].valueOf(), '<button class="btn" onclick="buyTicket(' + event_id + ',' +
      parseInt(item[2].valueOf()) + ')">Buy Ticket</button>'
    ]);
    events.push({
      id: event_id,
      data: item
    });
    // Load market/tickets after last event
    if (event_id == total - 1) {
      refreshMarket();
      refreshUserTickets();
      // Hide loading screen if not validator
      if (alrt) {
        swal(alrt);
        alrt = null;
      } else if ($('.sweet-alert h2').text() == 'Loading...')
        swal.close();
    }
    return true;
  }).catch(function(e) {
    error(e);
  });
}


/**** BUTTON FUNCTIONS ****/

// Buy ticket
function buyTicket(event_id, price, ticket_id) {
  var event_name = events[event_id].data[1];
  var on_market = ticket_id !== undefined;
  ticket_id = on_market ? ticket_id : 0;
  price += 1;
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
          " for " + showPrice(price - 1) + "!",
        type: "success",
        showConfirmButton: false,
        timer: 1750
      };
      refresh();
      return true;
    },
    "An error occurred. " + (on_market ? "This ticket might already be sold." :
      "This event might be sold out.")
  );
}

// Sell ticket
function sellTicket(ticket_id) {
  swal({
      title: "Sell Ticket",
      text: "Please enter a resale price",
      type: "input",
      showCancelButton: true,
      closeOnConfirm: false
    },
    function(input) {
      if (input === false) return false;
      if (input === "" || isNaN(input)
          || parseInt(input) < 0 || input.length > 10) {
        swal.showInputError("Amount invalid! Please try again.");
        return false
      }
      showLoading();
      send(ticketChain.sellTicket, [ticket_id, input, {
          from: account
        }],
        function() {
          setStatus("Transaction complete!");
          alrt = {
            title: "Success!",
            text: "Your ticket is now on the market.",
            type: "success",
            showConfirmButton: false,
            timer: 1750
          };
          refresh();
          return true;
        }
      );
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
        timer: 1750
      };
      refresh();
      return true;
    }
  );
}

// Validate ticket
function validateTicket(ticket_id, owner) {
  ticketChain.validateTicket.call(ticket_id, owner).then(function(is_valid) {
    if (is_valid)
      swal("Success!", "You have a valid ticket.", "success");
    else
      swal("Oops!", "This ticket is invalid.", "error");
  }).catch(function(e) {
    error(e);
  });
}


/**** CREATE FUNCTIONS ****/

// Create event
function newEvent() {
  var name = document.getElementById("event_name").value;
  var price = parseInt(document.getElementById("event_price").value);
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
  if (name === false) return false;
  if (name === "") {
    swal.showInputError("Please enter a valid name");
    return false
  }
  swal({
    title: "Hi " + name + "!",
    text: "Welcome to TicketChain.",
    timer: 1250
  });
  send(ticketChain.newUser, [name, {
      from: account
    }],
    function(resp) {
      setStatus("Transaction complete!");
      $("#yourName").html(resp[0]);
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

// Add item to table
function tableAdd(elem, item_id, attrs) {
  var tr = $('<tr>').attr('id', item_id);
  tr.addClass(elem == '#availableEvents' ?
    'event' : 'ticket');
  $(elem).append(tr);
  for (var attr of attrs)
    tr.append($('<td>').html(attr));
}

// Show loading popup
function showLoading() {
  swal({
    title: 'Loading...',
    text: '<img src="/images/loading.gif" height="100" width="100">',
    showConfirmButton: false,
    html: true
  });
}
// Open print screen
function openValidator(ticket_id) {
  swal({
    title: 'Ticket Validator',
    text: 'This verifies the QR code on your ticket with <em>TicketChain</em>.<br />Install one of the apps below and click Open Scanner.<br /><br />' +
      '<a href="https://play.google.com/store/apps/details?id=com.google.zxing.client.android" target="_blank"><img src="/images/playstore.png"></a> ' +
      '<a href="https://itunes.apple.com/ie/app/qrafter-qr-code-reader-generator/id416098700" target="_blank"><img src="/images/appstore.svg"></a><br />' +
      '<strong>Barcode Scanner</strong></a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
      '<strong>Qrafter</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;',
    confirmButtonText: "Open Scanner",
    showCancelButton: true,
    html: true
  }, function() {
    window.open("zxing://scan/?ret=" + encodeURIComponent(location.protocol + '//' +
      location.host + location.pathname + "?id=" + id + "&function=validate&ticket={CODE}"));
  });
  return false;
}

// Open print screen
function openPrint(ticket_id) {
  window.open('ticket/?id=' + ticket_id);
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

function showPrice(price) {
  return price == 0 ? 'Free' : '\u20AC' + price + '.00';
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
    timer: 1750
  });
  setStatus("An error occured; see log.");
}

/**** MAIN WINDOW ONLOAD EVENT ****/

window.onload = function() {
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

    // Show validation result
    if (getUrlParameter('function') == "validate")
      validateTicket(getUrlParameter('ticket'), account);

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
              type: "input",
              closeOnConfirm: false,
              closeOnCancel: false
            },
            function(input) {
              newUser(input);
            }
          );
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

    // Set account params
    document.getElementById("yourAccountID").innerHTML = id;
    //document.getElementById("yourBalance").innerHTML = web3.fromWei(web3.eth.getBalance(account));

  });
}