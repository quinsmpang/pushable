// Generated by CoffeeScript 1.3.3
(function() {
  var Player, Thing, UUID, V, app, b2d, box_body_def, box_fixture_def, box_shape_def, box_size, express, frame_rate, gravity, http, io, players, port, server, socket_io, speed, things, update, world;

  port = 8002;

  speed = 20;

  b2d = require('box2dnode');

  UUID = require('./library/uuid').UUID;

  V = require('./server_box2d_vector').V;

  frame_rate = require('./frame_rate');

  socket_io = require('socket.io');

  express = require('express');

  http = require('http');

  app = express();

  server = http.createServer(app);

  io = socket_io.listen(server);

  server.listen(port);

  app.use(express["static"](__dirname));

  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));

  things = {};

  gravity = V(0, 0);

  world = new b2d.b2World(gravity, true);

  box_size = V(2, 2);

  box_body_def = new b2d.b2BodyDef;

  box_body_def.type = b2d.b2Body.b2_dynamicBody;

  box_shape_def = new b2d.b2CircleShape;

  box_shape_def.m_radius = 1;

  box_fixture_def = new b2d.b2FixtureDef;

  box_fixture_def.shape = box_shape_def;

  box_fixture_def.density = 1.0;

  box_fixture_def.friction = 0.3;

  box_body_def.linearDamping = 1;

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
      return this.body.ApplyForce(direction.scale(speed), this.body.GetPosition());
    };

    Thing.prototype.changes = function() {
      return {
        id: this.id,
        position: this.body.GetPosition()
      };
    };

    return Thing;

  })();

  update = function() {
    var changes, id, player, thing;
    for (id in players) {
      player = players[id];
      player.control();
    }
    world.Step(frame_rate.frame_length_seconds, 10, 10);
    world.ClearForces();
    changes = (function() {
      var _results;
      _results = [];
      for (id in things) {
        thing = things[id];
        if (thing.body.IsAwake()) {
          _results.push(thing.changes());
        }
      }
      return _results;
    })();
    for (id in players) {
      player = players[id];
      player.socket.volatile.emit('update', changes);
    }
    return console.log(frame_rate.get_frame_delta());
  };

  app.get('/state', function(request, response) {
    response.writeHead(200, {
      'Content-Type': 'application/json'
    });
    return response.end(JSON.stringify({
      things: things,
      frame_rate: frame_rate.frames_per_second
    }));
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

  io.sockets.on('connection', function(socket) {
    var id, player;
    id = UUID();
    player = new Player(id);
    players[id] = player;
    player.socket = socket;
    socket.broadcast.emit('player_join', JSON.stringify(player.physics));
    socket.on('command_activate', function(command) {
      return player.press(command);
    });
    return socket.on('command_deactivate', function(command) {
      return player.release(command);
    });
  });

  frame_rate.get_frame_delta();

  setInterval(update, frame_rate.frame_length_milliseconds);

  console.log("Listening on " + port);

}).call(this);
