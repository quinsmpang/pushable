// Generated by CoffeeScript 1.3.3
(function() {
  var Faye, Player, Thing, UUID, V, app, b2d, box_body_def, box_fixture_def, box_shape_def, box_size, express, faye, faye_client, faye_keyboard, get_player, gravity, interval, players, port, things, update, world;

  port = 8000;

  interval = 1000 / 60;

  Faye = require('faye');

  express = require('express');

  UUID = require('./library/uuid').UUID;

  b2d = require('box2dnode');

  V = require('./server_box2d_vector').V;

  app = express.createServer();

  app.use(express["static"](__dirname));

  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));

  faye = new Faye.NodeAdapter({
    mount: '/faye'
  });

  faye_client = faye.getClient();

  faye.attach(app);

  things = {};

  gravity = V(0, 0);

  world = new b2d.b2World(gravity, true);

  box_size = V(1, 1);

  box_body_def = new b2d.b2BodyDef;

  box_body_def.type = b2d.b2Body.b2_dynamicBody;

  box_shape_def = new b2d.b2PolygonShape;

  box_shape_def.SetAsBox.apply(box_shape_def, box_size.components());

  box_fixture_def = new b2d.b2FixtureDef;

  box_fixture_def.shape = box_shape_def;

  box_fixture_def.density = 1.0;

  box_fixture_def.friction = 0.3;

  Thing = (function() {

    function Thing(id) {
      this.id = id != null ? id : UUID();
      this.body = world.CreateBody(box_body_def);
      this.body.CreateFixture(box_fixture_def);
      things[this.id] = this;
    }

    Thing.prototype.toJSON = function() {
      return {
        id: this.id,
        size: box_size,
        position: this.body.GetPosition()
      };
    };

    Thing.prototype.force = function(direction) {
      return this.body.ApplyForce(direction, this.body.GetPosition());
    };

    return Thing;

  })();

  update = function() {
    var id, player;
    for (id in players) {
      player = players[id];
      player.control();
    }
    world.Step(1 / 30, 10, 10);
    return faye_client.publish('/foo', JSON.stringify(things));
  };

  app.get('/objects', function(request, response) {
    response.writeHead(200, {
      'Content-Type': 'application/json'
    });
    return response.end(JSON.stringify(things));
  });

  players = {};

  Player = (function() {

    function Player(_arg) {
      this.id = _arg.id;
      this.commands = {};
      this.physics = new Thing(this.id);
    }

    Player.prototype.press = function(command) {
      return this.commands[command] = true;
    };

    Player.prototype.release = function(command) {
      return delete this.commands[command];
    };

    Player.prototype.control = function() {
      if (this.commands.left) {
        this.physics.force(V(-1, 0));
      }
      if (this.commands.right) {
        this.physics.force(V(+1, 0));
      }
      if (this.commands.up) {
        this.physics.force(V(0, -1));
      }
      if (this.commands.down) {
        return this.physics.force(V(0, +1));
      }
    };

    return Player;

  })();

  get_player = function(id) {
    if (!(id in players)) {
      players[id] = new Player({
        id: id
      });
    }
    return players[id];
  };

  faye_keyboard = {
    incoming: function(message, callback) {
      var player;
      player = get_player(message.clientId);
      if (message.channel === '/commands/activate') {
        player.press(message.data);
        return;
      }
      if (message.channel === '/commands/deactivate') {
        player.release(message.data);
        return;
      }
      return callback(message);
    }
  };

  faye.addExtension(faye_keyboard);

  setInterval(update, interval);

  app.listen(port);

  console.log("Listening on " + port);

}).call(this);
