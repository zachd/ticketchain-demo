var accounts;
var account;
var finished;
var ticketChain;

// Refresh tickets
function refreshTickets() {
  $("#myTickets tbody").empty();
  $("#availableTickets tbody").empty();

  ticketChain.getTotalTicketCount.call().then(function(count) {
    for (var i = 1; i <= count; i++)
      fetchTicket(i, count);
  }).catch(function(e) {
    console.log(e);
    setStatus("Error see log.");
  });
}

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
    console.log(e);
    setStatus("Error see log.");
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

function prepareBuy(id, price) {
  $('#buyTicketDiv').show();
  $('#selectbuyTicketDiv').hide();
  $('#ticketid').val(id);
  $('#price').val(price);
  $("#ticketid").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
  $('#price').fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
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

// Buy ticket
function buyTicket() {
  var price = parseInt(document.getElementById("price").value);
  var ticketid = document.getElementById("ticketid").value;
  setStatus("Initiating transaction... (please wait)");

  ticketChain.buyTicket.sendTransaction(ticketid, {
    from: account,
    value: price
  }).then(function() {
    setStatus("Transaction complete!");
    $('#notickets').hide();
    $('#ticketid').val('');
    $('#price').val('');
    $('#buyTicketDiv').hide();
    refreshTickets();
  }).catch(function(e) {
    console.log(e);
    setStatus("An error occured; see log.");
  });
};

// Sell ticket
function sellTicket(id) {
  var price = prompt("Please enter a price");
  ticketChain.sellTicket.sendTransaction(id, price, {
    from: account
  }).then(function() {
    setStatus("Transaction complete!");
    refreshTickets();
  }).catch(function(e) {
    console.log(e);
    setStatus("An error occured; see log.");
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
    console.log(e);
    setStatus("An error occured; see log.");
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
    console.log(e);
    setStatus("An error occured; see log.");
  });
}

// Create event
function newEvent() {
  var name = document.getElementById("event_name").value;
  var price = parseInt(document.getElementById("event_price").value);
  var num_tickets = parseInt(document.getElementById("event_num_tickets").value);
  setStatus("Initiating transaction... (please wait)");

  ticketChain.newEvent.sendTransaction(name, price, num_tickets, {
    from: account,
    gas: web3.toWei('1', 'szabo')
  }).then(function() {
    setStatus("Transaction complete!");
  }).catch(function(e) {
    console.log(e);
    setStatus("An error occured; see log.");
  });
};


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
  web3.eth.getAccounts(function(err, accs) {
    ticketChain = TicketChain.deployed();

    // Error checks
    if (err != null)
      alert("There was an error fetching your accounts.");
    if (accs.length == 0)
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");

    // Set account parameters
    accounts = accs;
    var id = getUrlParameter('id') || localStorage.getItem('account') || getRandomId();
    account = accounts[id];

    // Set validate link
    $('#validatelink').attr('href', "zxing://scan/?ret=" +
      encodeURIComponent(location.protocol + '//' + location.host + location.pathname +
        "?id=" + id + "&function=validate&ticket={CODE}"));

    // Show validation result
    if (getUrlParameter('function') == "validate")
      validateTicket(getUrlParameter('ticket'), account);

    document.getElementById("yourAccountID").innerHTML = id;
    document.getElementById("yourAddress").innerHTML = account;
    document.getElementById("yourBalance").innerHTML = web3.eth.getBalance(account);
    refreshTickets();
  });
}