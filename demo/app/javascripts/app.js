var accounts;
var account;
var tickets;
var ticketChain;


// Refresh user
function refreshUser() {
  $("#yourName").empty();

  ticketChain.getUser.call({
    from: account
  }).then(function(resp) {
    $("#yourName").html(resp[0]);
    tickets = resp[1];
  }).catch(function(e) {
    error(e)
  });
}

// Refresh tickets
function refreshTickets() {
  $("#myTickets tbody").empty();

  ticketChain.getUserTickets.call().then(function(tickets) {}).catch(function(e) {
    error(e)
  });
}

// Refresh events
function refreshEvents() {
  $("#availableEvents tbody").empty();

  ticketChain.getNumEvents.call().then(function(count) {
    for (var i = 1; i <= count; i++)
      fetchEvent(i);
    return true;
  }).catch(function(e) {
    error(e)
  });
}

// Fetch event
function fetchEvent(event_id) {
  ticketChain.getEvent.call(event_id).then(function(value) {
    var tr = $('<tr>').attr('id', event_id);
    $("#availableEvents").append(tr);
    tr.append($('<td>').html(event_id));
    tr.append($('<td>').html(value[0]));
    tr.append($('<td>').html(value[1]));
    tr.append($('<td>').html(value[2].valueOf()));
    tr.append($('<td>').html(value[3].valueOf()));
    tr.append($('<td>').html(value[4].valueOf()));
    tr.append($('<td>').html('<button class="btn" onclick="buyTicket(' + event_id + ',' +
      parseInt(value[2].valueOf()) + ')">Buy Ticket</button>'));
  }).catch(function(e) {
    error(e)
  });
}

// Buy ticket
function buyTicket(event_id, price, ticket_id) {
  price += 1;
  send(ticketChain.buyTicket, [event_id, 0, ticket_id !== undefined, {
      from: account,
      value: price
    }],
    function(resp) {
      setStatus("Transaction complete!");
      refreshUser();
      refreshEvents();
      refreshTickets();
      return true;
    }
  );
};

// Fetch ticket
function fetchTicket(id, count) {

  ticketChain.getTicketDetails.call(id).then(function(value) {
    var ticket = parseTicket(value);

    // Check if ticket is owned/available
    if (ticket.owner === account)
      addMyTicket(id, ticket);
    else if (ticket.forSale)
      addAvailableTicket(id, ticket);

    // Show no tickets text
    if (id == count && $('#myTickets tbody > tr').length == 0)
      $('#notickets').show();
  }).catch(function(e) {
    error(e)
  });
}

function parseTicket(ticket) {
  var resp = {};
  resp.owner = ticket[0];
  resp.price = ticket[1];
  resp.forSale = ticket[2];
  resp.description = ticket[3];
  return resp;
}

function addMyTicket(ticketId, ticketDetails) {

  var tr = $('<tr>').attr('id', ticketId);
  $("#myTickets").append(tr);

  tr.append($('<td>').html(ticketId));
  tr.append($('<td>').html(ticketDetails.owner));
  tr.append($('<td>').html(ticketDetails.description));
  tr.append($('<td>').html(ticketDetails.price.valueOf()));
  tr.append($('<td>').html('<button class="btn" onclick="openPrintTicketWindow(' + ticketId + ')">Print Ticket</button>'));

  if (ticketDetails.forSale) {
    tr.append($('<td>').html('<button class="btn" onclick="cancelTicket(' + ticketId + ')">Cancel Sale</button>'));
  } else {
    tr.append($('<td>').html('<button class="btn" onclick="sellTicket(' + ticketId + ')">Sell</button>'));
  }
}

function openPrintTicketWindow(ticketId) {
  window.open('print?id=' + ticketId);
  return false;
}

function addAvailableTicket(ticketId, ticketDetails) {
  var tr = $('<tr>').attr('id', ticketId);
  $("#availableTickets").append(tr);
  tr.append($('<td>').html(ticketId));
  tr.append($('<td>').html(ticketDetails.owner));
  tr.append($('<td>').html(ticketDetails.description));
  tr.append($('<td>').html(ticketDetails.price.valueOf()));
  tr.append($('<td>').html('<button class="btn" onclick="prepareBuy(' + ticketId + ',' +
    (parseInt(ticketDetails.price.valueOf()) + 1) + ')">Buy it!</button>'));
}

// Sell ticket
function sellTicket(id) {
  var price = prompt("Please enter a price");
  ticketChain.sellTicket.sendTransaction(id, price, {
    from: account
  }).then(function() {
    setStatus("Transaction complete!");
    refreshTickets();
  }).catch(function(e) {
    error(e)
  });
}

// Cancel ticket
function cancelTicket(id) {
  ticketChain.cancelTicketSale.sendTransaction(id, price, {
    from: account
  }).then(function() {
    setStatus("cancel complete!");
    refreshTickets();
  }).catch(function(e) {
    error(e)
  });
}

// Validate ticket
function validateTicket(ticketId, owner) {
  ticketChain.validateTicket.call(ticketId, owner).then(function(is_valid) {
    if (is_valid)
      swal("Success!", "You have a valid ticket.", "success");
    else
      swal("Oops!", "This ticket is invalid.", "error");
  }).catch(function(e) {
    error(e)
  });
}

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
      refreshEvents();
      return true;
    }
  );
};

// Send transaction
function send(endpoint, vars, callback) {
  setStatus("Initiating transaction... (please wait)");
  endpoint.estimateGas.apply(this, vars).then(function(gas) {
    vars[vars.length - 1].gas = gas;
    endpoint.apply(this, vars).then(function(val) {
      return callback(val);
    }).catch(function(e) {
      error(e)
    });
    return true;
  }).catch(function(e) {
    error(e)
  });
}

// Log error
function error(e) {
  console.log(e);
  setStatus("An error occured; see log.");
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
  var num = Math.floor(Math.random() * 100) + 1;
  localStorage.setItem('account', num);
  return num;
}

window.onload = function() {
  web3.eth.getAccounts(function(err, accounts) {
    ticketChain = TicketChain.deployed();

    // Error checks
    if (err != null)
      alert("There was an error fetching your accounts.");
    if (accounts.length == 0)
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");

    // Set account parameters
    var id = getUrlParameter('id') || localStorage.getItem('account') || getRandomId();
    account = accounts[id];
    web3.eth.defaultAccount = account;

    // Set validate link
    $('#validatelink').attr('href', "zxing://scan/?ret=" +
      encodeURIComponent(location.protocol + '//' + location.host + location.pathname +
        "?id=" + id + "&function=validate&ticket={CODE}"));

    // Show validation result
    if (getUrlParameter('function') == "validate")
      validateTicket(getUrlParameter('ticket'), account);

    // Check if user exists
    ticketChain.getUser.call({
      from: account
    }).then(function(resp) {
      if (resp[0] == "") {
        // Create user
        send(ticketChain.newUser, ["Test name", {
            from: account
          }],
          function(resp) {
            setStatus("Transaction complete!");
            refreshUser();
            return true;
          }
        );
      } else {
        // Set user params
        $("#yourName").html(resp[0]);
        tickets = resp[1];
      }
      return true;
    }).catch(function(e) {
      error(e)
    });

    // Set account params
    document.getElementById("yourAccountID").innerHTML = id;
    document.getElementById("yourAddress").innerHTML = account;
    document.getElementById("yourBalance").innerHTML = web3.eth.getBalance(account);

    // Refresh
    refreshTickets();
    refreshEvents();
  });
}