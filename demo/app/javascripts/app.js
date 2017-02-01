var accounts;
var account;
var tickets;
var events;
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
  $("#yourName").empty();
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
    tableAdd(elem, ticket_id, [event_name, ticket[2].valueOf(), buttons]);
    return true;
  }).catch(function(e) {
    error(e);
  });
}

// Fetch event
function fetchEvent(event_id, total) {
  ticketChain.getEvent.call(event_id).then(function(item) {
    tableAdd('#availableEvents', event_id, [item[1], item[2].valueOf(), item[3].valueOf(),
      item[4].valueOf(), '<button class="btn" onclick="buyTicket(' + event_id + ',' +
      parseInt(item[2].valueOf()) + ')">Buy Ticket</button>'
    ]);
    events.push({
      id: event_id,
      data: item
    });
    // Load market/tickets after last event
    if (event_id == total - 1){
      refreshUserTickets();
      refreshMarket();
    }
    return true;
  }).catch(function(e) {
    error(e);
  });
}


/**** BUTTON FUNCTIONS ****/

// Buy ticket
function buyTicket(event_id, price, ticket_id) {
  on_market = ticket_id !== undefined;
  ticket_id = on_market ? ticket_id : 0;
  price += 1;
  send(ticketChain.buyTicket, [event_id, ticket_id, on_market, {
      from: account,
      value: price
    }],
    function(resp) {
      setStatus("Transaction complete!");
      refresh();
      return true;
    }
  );
}

// Sell ticket
function sellTicket(ticket_id) {
  var price = prompt("Please enter a price");
  send(ticketChain.sellTicket, [ticket_id, price, {
      from: account
    }],
    function() {
      setStatus("Transaction complete!");
      refresh();
      return true;
    }
  );
}

// Cancel ticket
function cancelSale(ticket_id) {
  send(ticketChain.cancelSale, [ticket_id, {
      from: account
    }],
    function() {
      setStatus("Transaction complete!");
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
    swal.showInputError("You need to write something!");
    return false
  }
  send(ticketChain.newUser, [name, {
      from: account
    }],
    function(resp) {
      setStatus("Transaction complete!");
      $("#yourName").html(resp[0]);
      swal("Hi " + name + "!", "Welcome to TicketChain.");
      // Initial refresh (if new)
      refresh();
      return true;
    }
  );
}


/**** HELPER FUNCTIONS ****/

// Send transaction
function send(endpoint, vars, callback) {
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
    error(e);
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

// Check if admin
function isAdmin() {
  return window.location.pathname == '/admin/' ? 1 : null;
}

// Log error
function error(e) {
  console.log(e);
  setStatus("An error occured; see log.");
}

/**** MAIN WINDOW ONLOAD EVENT ****/

window.onload = function() {
  swal({
    title: 'Loading...',
    text: '<img src="images/loading.gif" height="100" width="100">',
    showConfirmButton: false,
    html: true
  });
  web3.eth.getAccounts(function(err, accounts) {
    ticketChain = TicketChain.deployed();

    // Error checks
    if (err != null)
      alert("There was an error fetching your accounts.");
    if (accounts.length == 0)
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");

    // Set account parameters
    var id = getUrlParameter('id') || isAdmin() || localStorage.getItem('account') || getRandomId();
    account = accounts[id];
    web3.eth.defaultAccount = account;

    // Set validate link
    $('#validatelink').attr('href', "zxing://scan/?ret=" +
      encodeURIComponent(location.protocol + '//' + location.host + location.pathname +
        "?id=" + id + "&function=validate&ticket={CODE}"));

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
              showCancelButton: true,
              closeOnConfirm: false
            },
            function(input) {
              newUser(input);
            }
          );
      } else {
        // Set user params
        $("#yourName").html(resp[0]);
        swal.close();
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
    document.getElementById("yourAddress").innerHTML = account;
    document.getElementById("yourBalance").innerHTML = web3.eth.getBalance(account);

  });
}