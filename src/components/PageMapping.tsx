import React from 'react';
import { makeStyles, Theme } from '@material-ui/core/styles';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}


function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}


function a11yProps(index: any) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
}));


export default function Mapping() {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  const [state, setState] = React.useState({
    checkedA: true,
    checkedB: true,
  });

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };

  return (
    <div>
      <div className={classes.root}>
        <AppBar position="static">
         <Tabs value={value} onChange={handleTabChange} aria-label="simple tabs example">
            <Tab label="Item One" {...a11yProps(0)} />
            <Tab label="Item Two" {...a11yProps(1)} />
            <Tab label="Item Three" {...a11yProps(2)} />
          </Tabs>
        </AppBar>
        <TabPanel value={value} index={0}>
          Item One
        </TabPanel>
        <TabPanel value={value} index={1}>
          Item Two
        </TabPanel>
        <TabPanel value={value} index={2}>
          Item Three
        </TabPanel>
      </div>
      <FormGroup row>
        <FormControlLabel
          control={<Switch checked={state.checkedA} onChange={handleSwitchChange} name="checkedA" />}
          label="Secondary"
        />
        <FormControlLabel
          control={
            <Switch
              checked={state.checkedB}
              onChange={handleSwitchChange}
              name="checkedB"
              color="primary"
            />
          }
          label="Primary"
        />
        <FormControlLabel control={<Switch />} label="Uncontrolled" />
        <FormControlLabel disabled={!state.checkedA} control={<Switch />} label="Disabled" />
        <FormControlLabel disabled={!state.checkedA && !state.checkedB} control={<Switch />}  label="Disabled" />
      </FormGroup>
    </div>
  );
}