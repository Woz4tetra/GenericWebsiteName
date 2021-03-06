// import { resolveSoa } from 'dns';
import React from 'react';
import Switch from "react-switch";
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DodobotState, CompressedImage, DodobotBatteryState, DodobotBumperState, DodobotDriveState, DodobotFSRsState, DodobotGripperState, DodobotLinearState } from './Sensors';
import ColorPicker from 'material-ui-color-picker';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import RotateRightIcon from '@material-ui/icons/RotateRight';
import EjectIcon from '@material-ui/icons/Eject';
import DockIcon from '@material-ui/icons/Dock';
import HomeIcon from '@material-ui/icons/Home';
import SendIcon from '@material-ui/icons/Send';
import TextField from '@material-ui/core/TextField';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';


var roslib = require('roslib');

// constants
const WS_URL = 'ws://192.168.0.21:9090';
const DEFAULT_LINEAR_VEL = 0.5;
const DEFAULT_ANGULAR_VEL = 1.5;

interface SensorsProps {
}

interface SensorsState {
  ros: any,

  // ros state
  robot_state?: DodobotState
  battery?: DodobotBatteryState,
  charger?: DodobotBatteryState,
  bumper?: DodobotBumperState,
  drive?: DodobotDriveState,
  fsrs?: DodobotFSRsState,
  gripper?: DodobotGripperState,
  linear?: DodobotLinearState,
  image?: CompressedImage,
  depth?: CompressedImage,
  charging?: boolean,
  colorTime: any,
  depthTime: any,
  motors_enabled: boolean,
  ring_light_on: boolean,
  ringLightColor?: any,
  button_motor_cmd_active: boolean,
  active_switch_set: boolean,
  keyboard_controls_enabled: boolean,

  robotStateService?: any,
  cmdVelPub?: any,
  linearStepperPub?: any,
  tilterCmdPub?: any,
  dockService?: any,
  undockService?: any,
  ringLightPub?: any,
  saveRobotPoseService?: any,
  parkRobotService?: any,

  linear_cmd: any,
  angular_cmd: any,

  waypointName: string,
  parkWaypointName: string,

  waypointAnchorEl?: any,
}

export default class Sensors extends React.Component<SensorsProps,SensorsState> {
  constructor(props:SensorsProps) {
    super(props);

    // setup state variables
    this.state = {
      ros: new roslib.Ros(),
      colorTime: new Date().getTime(),
      depthTime: new Date().getTime(),
      motors_enabled: false,
      keyboard_controls_enabled: false,
      button_motor_cmd_active: false,
      active_switch_set: false,
      linear_cmd: DEFAULT_LINEAR_VEL,
      angular_cmd: DEFAULT_ANGULAR_VEL,
      ring_light_on: false,
      ringLightColor: "#000000",
      waypointName: "",
      parkWaypointName: "",
    };

    // bind handlers
    this.getStateCallback = this.getStateCallback.bind(this);
    this.batteryCallback = this.batteryCallback.bind(this);
    this.isChargingCallback = this.isChargingCallback.bind(this);
    this.bumperCallback = this.bumperCallback.bind(this);
    this.driveCallback = this.driveCallback.bind(this);
    this.fsrsCallback = this.fsrsCallback.bind(this);
    this.gripperCallback = this.gripperCallback.bind(this);
    this.linearCallback = this.linearCallback.bind(this);
    this.imageCallback = this.imageCallback.bind(this);
    this.depthCallback = this.depthCallback.bind(this);
    this.chargerCallback = this.chargerCallback.bind(this);

    this.handleChangeMotorState = this.handleChangeMotorState.bind(this);
    this.handleControlsEnabledState = this.handleControlsEnabledState.bind(this);
    this.handleLinearVelChange = this.handleLinearVelChange.bind(this);
    this.handleAngularVelChange = this.handleAngularVelChange.bind(this);
    this.handleOnOffRingLight = this.handleOnOffRingLight.bind(this);
    this.handleChangeRingLight = this.handleChangeRingLight.bind(this);
    this.homeLinearStepper = this.homeLinearStepper.bind(this);

    this.handleWaypointNameChange = this.handleWaypointNameChange.bind(this);
    this.handleParkNameChange = this.handleParkNameChange.bind(this);

    this.runDockRoutine = this.runDockRoutine.bind(this);
    this.runUnDockRoutine = this.runUnDockRoutine.bind(this);
    this.createWaypointHere = this.createWaypointHere.bind(this);
    this.parkRobotHere = this.parkRobotHere.bind(this);

    this.MotorsEnabledSection = this.MotorsEnabledSection.bind(this);
    this.ControlsEnabledSection = this.ControlsEnabledSection.bind(this);
  }

  handleLinearVelChange(event: any) {
    var value = parseFloat(event.target.value);
    console.log("Setting linear velocity to: " + value);
    this.setState({linear_cmd: value});
  }
  handleAngularVelChange(event: any) {
    var value = parseFloat(event.target.value);
    console.log("Setting angular velocity to: " + value);
    this.setState({angular_cmd: value});
  }

  handleChangeMotorState(motors_enabled: boolean) {
    this.setState({ motors_enabled });
    console.log("Setting motors enabled to " + motors_enabled);

    var request = new roslib.ServiceRequest({active: motors_enabled, reporting: true});
    this.state.robotStateService.callService(request, function (response: any) {        
        console.log('Result for service call set state: ' + response);
    }, function(error: any){
        console.error("Got an error while trying to call set state service: " + error);
    });
  }

  handleControlsEnabledState(enabled: boolean) {
    this.setState({ keyboard_controls_enabled: enabled });
    console.log("Setting keyboard controls enabled to " + enabled);
  }

  handleWaypointNameChange(event: any) {
    this.setState({waypointName: event.target.value});
    this.setState({ keyboard_controls_enabled: false });
  }

  handleParkNameChange(event: any) {
    this.setState({parkWaypointName: event.target.value});
    this.setState({ keyboard_controls_enabled: false });
  }


  handleOnOffRingLight(ring_light_on: boolean)
  {
    this.setState({ ring_light_on });

    if (ring_light_on && this.state.ringLightColor) {
      var ring_color = {data: this.colorToInt(this.state.ringLightColor)};
    }
    else {
      var ring_color = {data: 0};
    }
    var msg = new roslib.Message(ring_color);
    console.log("Setting ring light to " + JSON.stringify(ring_color));
    this.state.ringLightPub.publish(msg);
  }

  handleChangeRingLight(ringLightColor: any)
  {
    if (ringLightColor) {
      this.setState({ringLightColor});
    
      let raw_color = this.colorToInt(ringLightColor);
      if (this.state.ring_light_on) {
        var msg = new roslib.Message({data: raw_color});
        console.log("Setting ring light to " + JSON.stringify(msg));
        this.state.ringLightPub.publish(msg);
      }

      console.log(raw_color);
      console.log(this.state.ringLightColor);
    }
  }

  colorToInt(hex_color: string) {
    if (hex_color.length <= 0) {
      return 0;
    }
    if (hex_color === "#ffffff") {
      return 0xffffffff;
    }
    else if (hex_color[0] === "#") {
      let r: number = parseInt(hex_color.slice(1, 3), 16);
      let g: number = parseInt(hex_color.slice(3, 5), 16);
      let b: number = parseInt(hex_color.slice(5, 7), 16);
      return ((r << 16) | (g << 8) | b) >>> 0;
    }
    else {
      let color_array = hex_color.split("(")[1].split(")")[0].split(",");
      let r: number = parseInt(color_array[0]);
      let g: number = parseInt(color_array[1]);
      let b: number = parseInt(color_array[2]);
      let a: number = Math.floor(255 * parseFloat(color_array[3]));
      return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
    }
  }

  componentDidMount() {
    this.initializeROS();
    this.initializePubsSubs(); 

    // document.addEventListener("click", this._handleDocumentClick, false);
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("mouseup", this.handleMouseUp);
  }

  componentWillUnmount() {
    this.state.ros.close();

    // document.removeEventListener("click", this._handleDocumentClick, false);
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
    document.addEventListener("mouseup", this.handleMouseUp);
  }

  initializeROS() {
    this.state.ros.on('error', (error: any) => console.log(error));
    this.state.ros.on('connection', (error: any) => console.log('Connection made!'));
    this.state.ros.on('close', (error: any) => console.log('Connection closed: ' + error));
    this.state.ros.connect(WS_URL);

    console.log('Hello!');
  }

  initializePubsSubs() {
    // chatter sub
    var batterySub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/battery',
      messageType: 'sensor_msgs/BatteryState'
    });

    var getStateSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/state',
      messageType: 'db_parsing/DodobotState'
    });

    var isChargingSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/is_charging',
      messageType: 'std_msgs/Bool'
    });

    var bumperSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/bumper',
      messageType: 'db_parsing/DodobotBumper'
    });

    var driveSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/drive',
      messageType: 'db_parsing/DodobotDrive'
    });

    var fsrsSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/fsrs',
      messageType: 'db_parsing/DodobotFSRs'
    });

    var gripperSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/gripper',
      messageType: 'db_parsing/DodobotGripper'
    });

    var linearSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/linear',
      messageType: 'db_parsing/DodobotLinear'
    });

    var imageSub = new roslib.Topic({
      ros: this.state.ros,
      // name: '/camera/color/image_raw/compressed',
      name: '/camera/color/image_thumb_raw/compressed',
      messageType: 'sensor_msgs/CompressedImage'
    });
    var depthSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/camera/depth/image_color_raw/compressed',
      messageType: 'sensor_msgs/CompressedImage'
    });

    var chargerSub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/charger',
      messageType: 'sensor_msgs/BatteryState'
    });

    var cmdVelPub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/cmd_vel',
      messageType: 'geometry_msgs/Twist'
    });
    this.setState({cmdVelPub});

    var tilterCmdPub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/tilter_cmd',
      messageType: 'db_parsing/DodobotTilter'
    });
    this.setState({tilterCmdPub});

    var linearStepperPub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/linear_cmd',
      messageType: 'db_parsing/DodobotLinear'
    });
    this.setState({linearStepperPub});
  
    var dockService = new roslib.Service({
      ros: this.state.ros,
      name: '/dodobot/dock_request',
      serviceType: 'std_srvs/Trigger'
    });
    this.setState({dockService});

    var undockService = new roslib.Service({
      ros: this.state.ros,
      name: '/dodobot/undock_request',
      serviceType: 'std_srvs/Trigger'
    });
    this.setState({undockService});
    
    var ringLightPub = new roslib.Topic({
      ros: this.state.ros,
      name: '/dodobot/ring_light_raw',
      messageType: 'std_msgs/UInt32'
    });
    this.setState({ringLightPub});

    var robotStateService = new roslib.Service({
      ros: this.state.ros,
      name: '/dodobot/set_state',
      serviceType: 'db_parsing/DodobotSetState'
    });

    this.setState({robotStateService});

    var saveRobotPoseService = new roslib.Service({
      ros: this.state.ros,
      name: '/dodobot/db_waypoints/save_robot_pose',
      serviceType: 'db_waypoints/SaveRobotPose'
    });

    this.setState({saveRobotPoseService});

    var parkRobotService = new roslib.Service({
      ros: this.state.ros,
      name: '/dodobot/park_request',
      serviceType: 'db_planning/NamedPose'
    });

    this.setState({parkRobotService});

    getStateSub.subscribe(this.getStateCallback)
    batterySub.subscribe(this.batteryCallback);
    isChargingSub.subscribe(this.isChargingCallback);
    chargerSub.subscribe(this.chargerCallback);
    bumperSub.subscribe(this.bumperCallback);
    driveSub.subscribe(this.driveCallback);
    fsrsSub.subscribe(this.fsrsCallback);
    gripperSub.subscribe(this.gripperCallback);
    linearSub.subscribe(this.linearCallback);
    imageSub.subscribe(this.imageCallback);
    depthSub.subscribe(this.depthCallback);
  }

  // ROS Callback Functions
  getStateCallback(message: any) {
    this.setState({
      robot_state: {
        battery_ok: message.battery_ok,
        motors_active: message.motors_active,
        loop_rate: message.loop_rate,
        is_ready: message.is_ready,
        robot_name: message.robot_name,
      }
    });

    if (!this.state.active_switch_set && message.motors_active) {
      this.setState({motors_enabled: message.motors_active});
      this.setState({active_switch_set: true});
    }
  }
  batteryCallback(message: any) {
    this.setState({
      battery: {
        voltage: message.voltage,
        current: message.current
      }
    });
  }

  isChargingCallback(message: any) {
    this.setState({
      charging: message.data
    });
  }

  chargerCallback(message: any) {
    this.setState({
      charger: {
        voltage: message.voltage,
        current: message.current,
      }
    });
  }

  bumperCallback(message: any) {
    this.setState({
      bumper: {
        left: message.left,
        right: message.right
      }
    });
  }

  driveCallback(message: any) {
    this.setState({
      drive: {
        left_setpoint: message.left_setpoint,
        right_setpoint: message.right_setpoint,
        left_enc_pos: message.left_enc_pos,
        right_enc_pos: message.right_enc_pos,
        left_enc_speed: message.left_enc_speed,
        right_enc_speed: message.right_enc_speed,
        left_bumper: message.left_bumper,
        right_bumper: message.right_bumper
      }
    });
  }

  fsrsCallback(message: any) {
    this.setState({
      fsrs: {
        left: message.left,
        right: message.right
      }
    });
  }

  gripperCallback(message: any) {
    this.setState({
      gripper: {
        position: message.position,
        force_threshold: message.force_threshold
      }
    });
  }

  linearCallback(message: any) {
    this.setState({
      linear: {
        position: message.position,
        has_error: message.has_error,
        is_homed: message.is_homed,
        is_active: message.is_active,
        command_type: message.command_type,
        command_value: message.command_value,
        max_speed: message.max_speed,
        acceleration: message.acceleration
      }
    })
  }
  depthCallback(message: any) {
    const imgSrc = "data:image/jpg;base64, " + message.data;

    const newTime = new Date().getTime();
    const fps = 1000 / (newTime - this.state.depthTime);
    
    this.setState({
      depth: {
        format: message.format,
        // data: message.data,
        imageSrc: imgSrc,
        fps: fps
      },

      depthTime: newTime
    });
  }

  imageCallback(message: any) {
    const imgSrc = "data:image/jpg;base64, " + message.data;

    const newTime = new Date().getTime();
    const fps = 1000 / (newTime - this.state.colorTime);
    
    this.setState({
      image: {
        format: message.format,
        // data: message.data,
        imageSrc: imgSrc,
        fps: fps
      },

      colorTime: newTime
    });
  }


  handleKeyDown = (event: any) => {
    if (!this.state.keyboard_controls_enabled) {
      return;
    }
    if (this.state.motors_enabled) {
      var twist = new roslib.Message({
        linear : {
          x : 0.0,
          y : 0.0,
          z : 0.0
        },
        angular : {
          x : 0.0,
          y : 0.0,
          z : 0.0
        }
      });
      var should_publish_twist = false;

      switch (event.key) {
        case "w":
          twist.linear.x = this.state.linear_cmd;
          console.log("Driving at " + twist.linear.x + " m/s");
          should_publish_twist = true;
          break;
        case "a":
          twist.angular.z = this.state.angular_cmd;
          console.log("Rotating at " + twist.angular.z + " rad/s");
          should_publish_twist = true;
          break;
        case "s":
          twist.linear.x = -this.state.linear_cmd;
          console.log("Driving at " + twist.linear.x + " m/s");
          should_publish_twist = true;
          break;
        case "d":
          twist.angular.z = -this.state.angular_cmd;
          console.log("Rotating at " + twist.angular.z + " rad/s");
          should_publish_twist = true;
          break;
        case "t":
          console.log("Toggling camera tilter");
          var tilter_msg = new roslib.Message({command: 2});
          this.state.tilterCmdPub.publish(tilter_msg);
          break;
        default:
          break;
      }
      if (should_publish_twist) {
        this.state.cmdVelPub.publish(twist);
      }
    }
    console.log('key down: ' + event.key);
  }
  handleMouseUp = (event: any) => {
    if (!this.state.keyboard_controls_enabled) {
      return;
    }
    console.log('mouse up: ' + JSON.stringify(event));
    if (this.state.button_motor_cmd_active) {
      var twist = new roslib.Message({
        linear : {
          x : 0.0,
          y : 0.0,
          z : 0.0
        },
        angular : {
          x : 0.0,
          y : 0.0,
          z : 0.0
        }
      });
      this.state.cmdVelPub.publish(twist);
    }
  }

  handleDriveLinear = (linear_x: number) => {
    this.setState({button_motor_cmd_active: true});
    var twist = new roslib.Message({
      linear : {
        x : linear_x,
        y : 0.0,
        z : 0.0
      },
      angular : {
        x : 0.0,
        y : 0.0,
        z : 0.0
      }
    });
    this.state.cmdVelPub.publish(twist);
  }
  handleDriveAngular = (angular_z: number) => {
    this.setState({button_motor_cmd_active: true});
    var twist = new roslib.Message({
      linear : {
        x : 0.0,
        y : 0.0,
        z : 0.0
      },
      angular : {
        x : 0.0,
        y : 0.0,
        z : angular_z
      }
    });
    this.state.cmdVelPub.publish(twist);
  }

  handleKeyUp = (event: any) => {
    if (!this.state.keyboard_controls_enabled) {
      return;
    }
    console.log('key up: ' + event.key);
    if (this.state.motors_enabled) {
      switch (event.key) {
        case "w":
        case "a":
        case "s":
        case "d":
        case " ":
          console.log('Stopping motors');
          var twist = new roslib.Message({
            linear : {
              x : 0.0,
              y : 0.0,
              z : 0.0
            },
            angular : {
              x : 0.0,
              y : 0.0,
              z : 0.0
            }
          });
        }
      this.state.cmdVelPub.publish(twist);
    }
  }

  MotorsEnabledSection() {
    if (this.state.motors_enabled) {
      return <h2>Motors enabled</h2>;
    }
    else {
      return <h2>Motors disabled</h2>;
    }
  }

  ControlsEnabledSection()
  {
    if (this.state.keyboard_controls_enabled) {
      return <p><b>Controls enabled:</b></p>;
    }
    else {
      return <p><b>Controls disabled:</b></p>;
    }
  }

  homeLinearStepper() {
      var command = new roslib.Message({
        command_type: 4,
        max_speed: -1,
        acceleration: -1
      });
      this.state.linearStepperPub.publish(command);
  }

  runDockRoutine()
  {
    console.log("Running dock routine");
    var request = new roslib.ServiceRequest({});
    this.state.dockService.callService(request, function (response: any) {        
        console.log('Dock result: ' + response);
    }, function(error: any){
        console.error("Got an error while trying to call dock service: " + error);
    });
  }

  runUnDockRoutine()
  {
    console.log("Running undock routine");
    var request = new roslib.ServiceRequest({});
    this.state.undockService.callService(request, function (response: any) {        
        console.log('Undock result: ' + response);
    }, function(error: any){
        console.error("Got an error while trying to call undock service: " + error);
    });
  }

  createWaypointHere()
  {
    if (this.state.waypointName.length <= 0) {
      console.log("Waypoint name must not be empty! " + this.state.waypointName);
      return;
    }
    console.log("Create waypoint here");
    var request = new roslib.ServiceRequest({name: this.state.waypointName});
    this.state.saveRobotPoseService.callService(request, function (response: any) {        
        console.log('Save robot pose result: ' + response);
    }, function(error: any){
        console.error("Got an error while trying to call save robot pose service: " + JSON.stringify(error));
    });
  }

  parkRobotHere()
  {
    if (this.state.parkWaypointName.length <= 0) {
      console.log("Waypoint name must not be empty! " + this.state.parkWaypointName);
      return;
    }
    console.log("Park robot at " + this.state.parkWaypointName);
    var request = new roslib.ServiceRequest({name: this.state.parkWaypointName});
    this.state.parkRobotService.callService(request, function (response: any) {        
        console.log('Park robot result: ' + response);
    }, function(error: any){
        console.error("Got an error while trying to call park robot service: " + JSON.stringify(error));
    });
  }

  render() {
    const battery = this.state.battery;
    const bumper = this.state.bumper;
    const drive = this.state.drive;
    const fsrs = this.state.fsrs;
    const image = this.state.image;
    const depth = this.state.depth;
    const is_charging = this.state.charging;
    const charger = this.state.charger;

    return <div>
      <a href="http://192.168.0.21:8080/admin">Pi-Hole Admin Console</a>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridGap: 20 }}>
        <div>
          <this.MotorsEnabledSection />
          <Switch onChange={this.handleChangeMotorState} checked={this.state.motors_enabled} />
          <br></br>
          
          <div className="row custom-margin material2">
              <div className="col-xs-6 col-sm-6 col-lg-6 col-md-6"><b>Velocity inputs</b></div>
          </div>
          <div className="row custom-margin custom-padding-5 material2">
              <div className="col-xs-6 col-sm-6 col-lg-6 col-md-6">
                  <TextBoxComponent placeholder="Linear Velocity (m/s)" cssClass="e-outline" floatLabelType="Auto" value={DEFAULT_LINEAR_VEL + ""} onChange={this.handleLinearVelChange}/>
              </div>
              <div className="col-xs-6 col-sm-6 col-lg-6 col-md-6">
                  <TextBoxComponent placeholder="Angular Velocity (rad/s)" cssClass="e-outline" floatLabelType="Auto" value={DEFAULT_ANGULAR_VEL + ""} onChange={this.handleAngularVelChange}/>
              </div>
          </div>
        </div>
        <div>
          <Switch onChange={this.handleControlsEnabledState} checked={this.state.keyboard_controls_enabled} />
          <this.ControlsEnabledSection/>
          <p>W = drive forward</p>
          <p>A = rotate left</p>
          <p>S = drive backward</p>
          <p>D = rotate right</p>
          <p>T = toggle camera tilter</p>
        </div>
      </div> 
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 2fr)", gridGap: 20, width: 250, height: 150 }}>
        <div></div>
        <IconButton aria-label="up" color="primary"> <ArrowUpwardIcon onMouseDown={() => { this.handleDriveLinear(this.state.linear_cmd) }} fontSize="large" /> </IconButton>
        <div></div>
        <IconButton aria-label="left" color="primary"> <RotateLeftIcon onMouseDown={() => { this.handleDriveAngular(this.state.angular_cmd) }} fontSize="large" /> </IconButton>
        <IconButton aria-label="down" color="primary"> <ArrowDownwardIcon onMouseDown={() => { this.handleDriveLinear(-this.state.linear_cmd) }} fontSize="large" /> </IconButton>
        <IconButton aria-label="right" color="primary"> <RotateRightIcon onMouseDown={() => { this.handleDriveAngular(-this.state.angular_cmd) }} fontSize="large" /> </IconButton>

      </div>
      <hr/>

      <div>
        <h2>Routines</h2>
        <div>
          <Button
            style={{ margin: 5 }}
            variant="contained"
            color="primary"
            className="dock_button"
            startIcon={<DockIcon />}
            onClick={this.runDockRoutine}
          >
            Dock
          </Button>
          <Button
            style={{ margin: 5 }}
            variant="contained"
            color="primary"
            className="undock_button"
            startIcon={<EjectIcon />}
            onClick={this.runUnDockRoutine}
          >
            Undock
          </Button>

          <div style={{
              padding: '2px 4px',
              margin: 5,
              display: 'flex',
              alignItems: 'center',
              width: 250,
            }}>
            <TextField
              style={{
                marginLeft: 5,
                flex: 1,
              }}
              placeholder="Name location"
              inputProps={{ 'aria-label': 'part at' }}
              onChange={ this.handleWaypointNameChange }
            />
            <IconButton type="submit" aria-label="submit create waypoint" style={{
                padding: 10,
              }} onClick={this.createWaypointHere}>
              <SendIcon />
            </IconButton>
          </div>
          <div style={{
              padding: '2px 4px',
              margin: 5,
              display: 'flex',
              alignItems: 'center',
              width: 250,
            }}>
            <TextField
              style={{
                marginLeft: 5,
                flex: 1,
              }}
              placeholder="Park at"
              inputProps={{ 'aria-label': 'part at' }}
              onChange={ this.handleParkNameChange }
            />
            <IconButton type="submit" aria-label="list waypoints" style={{
                padding: 10,
              }} onClick={this.parkRobotHere}>
              <ArrowDropDownIcon />
            </IconButton>
            <IconButton type="submit" aria-label="submit park at" style={{
                padding: 10,
              }} onClick={this.parkRobotHere}>
              <SendIcon />
            </IconButton>
            
            
            {/* <Menu
              id="simple-menu"
              anchorEl={this.state.waypointAnchorEl}
              keepMounted
              open={Boolean(this.state.waypointAnchorEl)}
              onClose={this.handleClose}
            >
              <MenuItem onClick={this.handleClose}>Profile</MenuItem>
              <MenuItem onClick={this.handleClose}>My account</MenuItem>
              <MenuItem onClick={this.handleClose}>Logout</MenuItem>
            </Menu> */}
          </div>
        </div> 
      </div>

      <div  style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gridGap: 20 }}>
        <div hidden={!image}>
          <h2>Color Camera</h2>
          Image format: {image?.format}<br/>
          {/* Data: {image?.data}<br/> */}
          FPS: {image?.fps.toFixed(1)}<br/>
          <img style={{width:"700"}} src={image?.imageSrc}></img>
        </div>
        <div hidden={!depth}>
          <h2>Depth Camera</h2>
          Image format: {image?.format}<br/>
          {/* Data: {image?.data}<br/> */}
          FPS: {depth?.fps.toFixed(1)}<br/>
          <img style={{width:"700"}} src={depth?.imageSrc}></img>
        </div>
      </div>

      <div>
        <h2>Gripper controls</h2>
        <Button
          variant="contained"
          color="primary"
          className="home_button"
          startIcon={<HomeIcon />}
          onClick={this.homeLinearStepper}
        >
          Home linear
        </Button>
      </div>

      <div>
        <h2>Ring Light</h2>
        <Switch onChange={this.handleOnOffRingLight} checked={this.state.ring_light_on} />
        <div style={{ height: 100 }}>
          <ColorPicker
            name='color'
            label={this.state.ringLightColor}
            onChange={this.handleChangeRingLight}
          >
            {this.state.ringLightColor}
            </ColorPicker>
        </div>
      </div>

      <div hidden={!battery}>
        <h2>Battery</h2>
        <p><b>Voltage:</b> {battery?.voltage.toFixed(2)} V</p>
        <p><b>Current:</b> {battery?.current.toFixed(2)} mA</p>
        <hr/>
      </div> 
      <div hidden={!charger}>
        <h2>Charger</h2>
        <p><b>Voltage:</b> {charger?.voltage.toFixed(2)} V</p>
        <p><b>Current:</b> {charger?.current.toFixed(2)} mA</p>
        <p><b>Is Charging:</b> {is_charging ? "Yes" : "No"}</p>
        <hr/>
      </div> 
      <div hidden={!bumper}>
        <h2>Bumper</h2>
        <p><b>Left:</b> {bumper?.left + ""}</p>
        <p><b>Right:</b> {bumper?.right + ""}</p>
        <hr/>
      </div>
      <div hidden={!drive}>
        <h2>Drive</h2>
        <p><b>Left Enc Pos:</b> {drive?.left_enc_pos}</p>
        <p><b>Right Enc Pos:</b> {drive?.right_enc_pos}</p>
        <hr/>
      </div>
      <div hidden={!fsrs}>
        <h2>Force Sensors</h2>
        <p><b>Left:</b> {fsrs?.left}</p>
        <p><b>Right:</b> {fsrs?.right}</p>
      </div>
    </div>
  }
}