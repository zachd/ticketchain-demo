pragma solidity ^0.4.2;

contract TicketChain {

    struct User {
        string name;
        uint[] ticket_ids;
    }

    struct Event {
        address owner;
        string name;
        uint price;
        uint num_tickets;
        uint num_sold;
        uint[] market_ticket_ids;
    }

    struct Ticket {
        address owner;
        uint event_id;
        uint price;
        bool on_market;
    } 

    uint num_events = 0;
    uint num_tickets = 0;

    mapping(address => User) public users;
    mapping(uint => Event) public events;
    mapping(uint => Ticket) public tickets;

    function TicketChain() {
    }

    function newUser(string name) {
    	if(bytes(name).length == 0) throw;
        users[msg.sender].name = name;
    }

    function newEvent(string name, uint price, uint num_tickets) {
    	if(bytes(name).length == 0) throw;
        num_events += 1;
        events[num_events].owner = msg.sender;
        events[num_events].name = name;
        events[num_events].price = price;
        events[num_events].num_tickets = num_tickets;
    }

    function newTicket(address owner, uint event_id, uint price) returns(uint){
        num_tickets += 1;
        tickets[num_tickets] = Ticket({owner: owner, event_id: event_id, price: price, on_market: false});
        return num_tickets;
    }

    function buyTicket(uint event_id, uint ticket_id, bool on_market) payable returns(bool) {
    	User user = users[msg.sender];
    	if(bytes(user.name).length == 0) throw;

    	Event evnt = events[event_id];
    	if(bytes(evnt.name).length == 0) throw;
		uint price = evnt.price;
		address owner_addr = evnt.owner;

		// Perform some checks
        if(on_market){
        	if (!tickets[ticket_id].on_market) throw; // Ticket not for sale
        	price = tickets[ticket_id].price;
        	owner_addr = tickets[ticket_id].owner;
        } else {
        	if(evnt.num_sold >= evnt.num_tickets) throw; // Sold out
        }
        if (msg.value <= price) throw; // Insufficient funds

        User owner = users[owner_addr];

        // Remove from event/user
        if(on_market){
        	removeFromUser(owner_addr, ticket_id);
        	removeFromEvent(event_id, ticket_id);
        } else {
        	ticket_id = newTicket(msg.sender, event_id, evnt.price);
        	evnt.num_sold += 1;
        }

        // Send price of ticket to owner
        bool x = owner_addr.send(price);

        // Set new owner of ticket
        tickets[ticket_id].owner = msg.sender;
        tickets[ticket_id].on_market = false;
        user.ticket_ids.push(ticket_id);
        return true;
    }

    function sellTicket(uint ticket_id, uint price) returns(bool) {
        Ticket ticket = tickets[ticket_id];

        // Perform some checks
        if (!(ticket.owner == msg.sender)) throw;
        if (ticket.on_market) throw;

   		// Add market data to event
        Event evnt = events[ticket.event_id];
        evnt.market_ticket_ids.push(ticket_id);

        // Set price and return
        ticket.price = price;
        ticket.on_market = true;
        return true;
    }

    function cancelSale(uint ticket_id) returns(bool) {
        Ticket ticket = tickets[ticket_id];

        // Perform some checks
        if (!(ticket.owner == msg.sender)) throw;
        if (!ticket.on_market) throw;

        // Remove from event
        Event evnt = events[ticket.event_id];
        removeFromEvent(ticket.event_id, ticket_id);

        // Set ticket to off market
        ticket.on_market = false;
        return true;
    }

    function validateTicket(uint _uid, address owner) returns(bool) {
        return (tickets[_uid].owner == owner);
    }

    function getUserTickets() returns(uint[] ticket_ids) {
        return users[msg.sender].ticket_ids;
    }

    function getNumEvents() returns(uint) {
        return num_events;
    }

    function removeFromEvent(uint event_id, uint ticket_id){
    	Event evnt = events[event_id];
    	for(uint i = 0; i < evnt.market_ticket_ids.length; i++){
    		if(evnt.market_ticket_ids[i] == ticket_id){
    			if(i < evnt.market_ticket_ids.length - 1){
    				evnt.market_ticket_ids[i] = evnt.market_ticket_ids[evnt.market_ticket_ids.length - 1];
    				delete evnt.market_ticket_ids[evnt.market_ticket_ids.length - 1];
    			} else {
    				delete evnt.market_ticket_ids[i];
    			}
    		}
    	}
    }

    function removeFromUser(address owner_addr, uint ticket_id){
    	User owner = users[owner_addr];
    	for(uint i = 0; i < owner.ticket_ids.length; i++){
    		if(owner.ticket_ids[i] == ticket_id){
    			if(i < owner.ticket_ids.length - 1){
    				owner.ticket_ids[i] = owner.ticket_ids[owner.ticket_ids.length - 1];
    				delete owner.ticket_ids[owner.ticket_ids.length - 1];
    			} else {
    				delete owner.ticket_ids[i];
    			}
    		}
    	}
    }

    function getUser() returns(string name, uint[] ticket_ids) {
        name = users[msg.sender].name;
        ticket_ids = users[msg.sender].ticket_ids;
    }

    function getEvent(uint event_id) returns(address owner, string name, uint price, uint num_tickets, uint num_sold, uint[] market_ticket_ids) {
        owner = events[event_id].owner;
        name = events[event_id].name;
        price = events[event_id].price;
        num_tickets = events[event_id].num_tickets;
        num_sold = events[event_id].num_sold;
        market_ticket_ids = events[event_id].market_ticket_ids;
    }

    function getTicket(uint ticket_id) returns(address owner, uint event_id, uint price, bool on_market) {
        owner = tickets[ticket_id].owner;
        event_id = tickets[ticket_id].event_id;
        price = tickets[ticket_id].price;
        on_market = tickets[ticket_id].on_market;
    }
}
