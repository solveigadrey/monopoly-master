var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 60;
Monopoly.doubleCounter = 0;

Monopoly.init = function() {
  $(document).ready(function() {
    Monopoly.adjustBoardSize();
    $(window).bind("resize", Monopoly.adjustBoardSize);
    Monopoly.initDice();
    Monopoly.initPopups();
    Monopoly.start();
  });
};

Monopoly.start = function() {
  Monopoly.showPopup("intro")
};


Monopoly.initDice = function() {
  $(".dice").click(function() {
    if (Monopoly.allowRoll) {
      Monopoly.rollDice();
    }
  });
};


Monopoly.getCurrentPlayer = function() {
  return $(".player.current-turn");
};

Monopoly.getPlayersCell = function(player) {
  return player.closest(".cell");
};


Monopoly.getPlayersMoney = function(player) {
  return parseInt(player.attr("data-money"));
};

Monopoly.updatePlayersMoney = function(player, amount) {
  var playersMoney = parseInt(player.attr("data-money"));
  playersMoney -= amount;
  player.attr("data-money", playersMoney);
  player.attr("title", player.attr("id") + ": $" + playersMoney);
  Monopoly.playSound("chaching");
};

Monopoly.checkIfBroke = function(player){
  var playersMoney = parseInt(player.attr("data-money"));
  if (playersMoney < 0) {
    player.addClass("removed");
    var playerId = player.attr("id");
    var properties = $("." + playerId);
    if(properties.length>0){
      for (var i=0; i<properties.length; i++){
        properties[i].classList.remove(playerId);
      }//we set the player the attribute broke to say that he doesn't have money anymore
  
    }
    var popup = Monopoly.getPopup("broke"); 
    popup.find("button").unbind("click").bind("click", Monopoly.closePopup); 
    Monopoly.showPopup("broke"); 
   
    
  }
}

/* Here we want to randmomize the number of the dice between 1 and 6
We are using the opacity to show or not the black dot of the dice
we had to make changes in the html in order to make the 4 nicer than it look like
a real 4 of the dice (by deleting and adding num4 in some places)
We are using Jquery to find divs that have the classname .dice-dot.num + a random
number (between 1 and 6) and we change the opacity to one*/
Monopoly.rollDice = function() {
  var currentPlayer = Monopoly.getCurrentPlayer();

  var result1 = Math.floor(Math.random() * 6) + 1;
  var result2 = Math.floor(Math.random() * 6) + 1;
  $(".dice").find(".dice-dot").css("opacity", 0);
  $(".dice#dice1").attr("data-num", result1).find(".dice-dot.num" + result1).css("opacity", 1);
  $(".dice#dice2").attr("data-num", result2).find(".dice-dot.num" + result2).css("opacity", 1);
  if (result1 == result2) {
    // here we want to check if the player has a double dice
  Monopoly.doubleCounter++;
} else {
  Monopoly.doubleCounter =0;
}
  var currentPlayer = Monopoly.getCurrentPlayer();
  Monopoly.handleAction(currentPlayer, "move", result1 + result2);
};


Monopoly.movePlayer = function(player, steps) {
  Monopoly.allowRoll = false;
  var playerMovementInterval = setInterval(function() {
    if (steps == 0) {
      clearInterval(playerMovementInterval);
      Monopoly.handleTurn(player);
    } else {
      var playerCell = Monopoly.getPlayersCell(player);
      var nextCell = Monopoly.getNextCell(playerCell);
      nextCell.find(".content").append(player);
      steps--;
    }
  }, 200);
};


Monopoly.handleTurn = function() {
  var player = Monopoly.getCurrentPlayer();
  var playerCell = Monopoly.getPlayersCell(player);
  if (playerCell.is(".available.property")) {
    Monopoly.handleBuyProperty(player, playerCell);
  } else if (playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))) {
    Monopoly.handlePayRent(player, playerCell);
  } else if (playerCell.is(".go-to-jail")) {
    Monopoly.handleGoToJail(player);
  } else if (playerCell.is(".chance")) {
    Monopoly.handleChanceCard(player);
  } else if (playerCell.is(".community")) {
    Monopoly.handleCommunityCard(player);
  } else {
    Monopoly.setNextPlayerTurn();
  }
}

Monopoly.setNextPlayerTurn = function() {
  var currentPlayerTurn = Monopoly.getCurrentPlayer();
  var playerId = parseInt(currentPlayerTurn.attr("id").replace("player", ""));
  var nextPlayerId = playerId + 1;
  /* here we want to complete the possibility of the player to have a double dice and allow him to play again*/
  if (Monopoly.doubleCounter > 0 && !(currentPlayerTurn.is(".jailed") && !(currentPlayerTurn.is(".removed")))) { // here we added the case when the player has the class removed 
          nextPlayerId = playerId;
      } else {
          nextPlayerId = playerId + 1;
      }

  if (nextPlayerId > $(".player").length) {
    nextPlayerId = 1;
  }
  currentPlayerTurn.removeClass("current-turn");
  var nextPlayer = $(".player#player" + nextPlayerId);
  nextPlayer.addClass("current-turn");
  if (nextPlayer.is(".jailed")) {
    var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
    currentJailTime++;
    nextPlayer.attr("data-jail-time", currentJailTime);
    if (currentJailTime > 3) {
      nextPlayer.removeClass("jailed");
      nextPlayer.removeAttr("data-jail-time");
    }
    Monopoly.setNextPlayerTurn();
    return;
  }
  if (nextPlayer.is(".removed")) {
    Monopoly.setNextPlayerTurn();
    return; // in case our player is removed, we just set the next players turn 
  }
  Monopoly.closePopup();
  Monopoly.allowRoll = true;
};  



Monopoly.handleBuyProperty = function(player, propertyCell) {
  var propertyCost = Monopoly.calculateProperyCost(propertyCell);
  var popup = Monopoly.getPopup("buy");
  popup.find(".cell-price").text(propertyCost);
  popup.find("button").unbind("click").bind("click", function() {
    var clickedBtn = $(this);
    if (clickedBtn.is("#yes")) {
      Monopoly.handleBuy(player, propertyCell, propertyCost);
    } else {
      Monopoly.closeAndNextTurn();
    }
  });
  Monopoly.showPopup("buy");
};

Monopoly.handlePayRent = function(player, propertyCell) {
  var popup = Monopoly.getPopup("pay");
  var currentRent = parseInt(propertyCell.attr("data-rent"));
  var properyOwnerId = propertyCell.attr("data-owner");
  popup.find("#player-placeholder").text(properyOwnerId);
  popup.find("#amount-placeholder").text(currentRent);
  popup.find("button").unbind("click").bind("click", function() {
    var properyOwner = $(".player#" + properyOwnerId);
    Monopoly.closeAndNextTurn(); // was 3 lines after
    Monopoly.updatePlayersMoney(player, currentRent);
    Monopoly.updatePlayersMoney(properyOwner, -1 * currentRent);
    Monopoly.checkIfBroke(player);

  });
  Monopoly.showPopup("pay");
};


Monopoly.handleGoToJail = function(player) {
  var popup = Monopoly.getPopup("jail");
  popup.find("button").unbind("click").bind("click", function() {
    Monopoly.handleAction(player, "jail");
  });
  Monopoly.showPopup("jail");
};

/* We ask the server to return a string (randomly) and the value of this string will be the statement of the card */
Monopoly.handleChanceCard = function(player) {
  var popup = Monopoly.getPopup("chance");
  popup.find(".popup-content").addClass("loading-state");
  $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson) {
    popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
    popup.find(".popup-title").text(chanceJson["title"]);
    popup.find(".popup-content").removeClass("loading-state");
    popup.find(".popup-content button").attr("data-action", chanceJson["action"]).attr("data-amount", chanceJson["amount"]);
  }, "json");
  popup.find("button").unbind("click").bind("click", function() {
    var currentBtn = $(this);
    var action = currentBtn.attr("data-action");
    var amount = currentBtn.attr("data-amount");
    Monopoly.handleAction(player, action, amount);
  });
  Monopoly.showPopup("chance");
};


/* this function is like the chanceCard in its code. We ask the server to return a string (randomly)
 and the value of this string will be the statement of the card */
Monopoly.handleCommunityCard = function(player) {
  var popup = Monopoly.getPopup("community");
  popup.find(".popup-content").addClass("loading-state");
  $.get("https://itcmonopoly.appspot.com//get_random_community_card", function(communityJson){
    popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
    popup.find(".popup-title").text(communityJson["title"]);
    popup.find(".popup-content").removeClass("loading-state");
    popup.find(".popup-content button").attr("data-action", communityJson["action"]).attr("data-amount",communityJson["amount"]);
  }, "json");
  popup.find("button").unbind("click").bind("click", function() {
    var currentBtn = $(this);
    var action = currentBtn.attr("data-action");
    var amount = currentBtn.attr("data-amount");
    Monopoly.handleAction(player, action, amount);
  });
    Monopoly.showPopup("community");
};


Monopoly.sendToJail = function(player) {
  player.addClass("jailed");
  player.attr("data-jail-time", 1);
  $(".corner.game.cell.in-jail").append(player);
  Monopoly.playSound("woopwoop");
  Monopoly.setNextPlayerTurn();
  Monopoly.closePopup();
};


Monopoly.getPopup = function(popupId) {
  return $(".popup-lightbox .popup-page#" + popupId);
};

Monopoly.calculateProperyCost = function(propertyCell) {
  var cellGroup = propertyCell.attr("data-group");
  var cellPrice = parseInt(cellGroup.replace("group", "")) * 5;
  if (cellGroup == "rail") {
    cellPrice = 10;
  }
  return cellPrice;
};


Monopoly.calculateProperyRent = function(propertyCost) {
  return propertyCost / 2;
};


Monopoly.closeAndNextTurn = function() {
  Monopoly.setNextPlayerTurn();
  Monopoly.closePopup();
};

Monopoly.initPopups = function() {
  $(".popup-page#intro").find("button").click(function() {
    var numOfPlayers = $(this).closest(".popup-page").find("input").val();
    if (Monopoly.isValidInput("numofplayers", numOfPlayers)) {
      Monopoly.createPlayers(numOfPlayers);
      Monopoly.closePopup();
    }
  });
};


Monopoly.handleBuy = function(player, propertyCell, propertyCost) {
  var playersMoney = Monopoly.getPlayersMoney(player)
  if (playersMoney < propertyCost) {
    Monopoly.playSound("dollar");
    Monopoly.showErrorMsg();
  } else {
    Monopoly.updatePlayersMoney(player, propertyCost);
    var rent = Monopoly.calculateProperyRent(propertyCost);

    propertyCell.removeClass("available")
      .addClass(player.attr("id"))
      .attr("data-owner", player.attr("id"))
      .attr("data-rent", rent);
    Monopoly.setNextPlayerTurn();
  }
};


Monopoly.handleAction = function(player, action, amount) {
  switch (action) {
    case "move":
      Monopoly.movePlayer(player, amount);
      break;
    case "pay":
      Monopoly.updatePlayersMoney(player, amount);
      Monopoly.checkIfBroke(player);
      Monopoly.setNextPlayerTurn();
      break;
    case "jail":
      Monopoly.sendToJail(player);
      break;
  };
  Monopoly.closePopup();
};


Monopoly.createPlayers = function(numOfPlayers) {
  var startCell = $(".go");
  for (var i = 1; i <= numOfPlayers; i++) {
    var player = $("<div />").addClass("player shadowed").attr("id", "player" + i).attr("title", "player" + i + ": $" + Monopoly.moneyAtStart);
    startCell.find(".content").append(player);
    if (i == 1) {
      player.addClass("current-turn");
    }
    player.attr("data-money", Monopoly.moneyAtStart);
  }
};


Monopoly.getNextCell = function(cell) {
  var currentCellId = parseInt(cell.attr("id").replace("cell", ""));
  var nextCellId = currentCellId + 1
  if (nextCellId > 40) {
    Monopoly.handlePassedGo();
    nextCellId = 1;
  }
  return $(".cell#cell" + nextCellId);
};


Monopoly.handlePassedGo = function() {
  var player = Monopoly.getCurrentPlayer();
  Monopoly.updatePlayersMoney(player, (-1)*Monopoly.moneyAtStart / 10); //as we have a division, we put minus one to get a positive number
};


Monopoly.isValidInput = function(validate, value) {
  var isValid = false;
  switch (validate) {
    case "numofplayers":
      if (value > 1 && value <= 4) {
        isValid = true;
      } else {
        isValid = false;
      }
  }

  if (!isValid) {
    Monopoly.showErrorMsg();
  }
  return isValid;

}

Monopoly.showErrorMsg = function() {
  $(".popup-page .invalid-error").fadeTo(500, 1);
  setTimeout(function() {
    $(".popup-page .invalid-error").fadeTo(500, 0);
  }, 2000);
};


Monopoly.adjustBoardSize = function() {
  var gameBoard = $(".board");
  var boardSize = Math.min($(window).height(), $(window).width());
  boardSize -= parseInt(gameBoard.css("margin-top")) * 2;
  $(".board").css({
    "height": boardSize,
    "width": boardSize
  });
}

Monopoly.closePopup = function() {
  $(".popup-lightbox").fadeOut();
};

Monopoly.playSound = function(sound) {
  var snd = new Audio("./sounds/" + sound + ".wav");
  snd.play();
}

Monopoly.showPopup = function(popupId) {
  $(".popup-lightbox .popup-page").hide();
  $(".popup-lightbox .popup-page#" + popupId).show();
  $(".popup-lightbox").fadeIn();
};

Monopoly.init();

Monopoly.isbroke = function (){
  var currentPlayer = Monopoly.getCurrentPlayer();
  if ($(currentPlayer).attr('broke')=="true"){ //if the player doesn't have money, we pass his turn
    Monopoly.setNextPlayerTurn();
    return;
  }
}
