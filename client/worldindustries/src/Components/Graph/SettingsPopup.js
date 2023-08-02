import React, { useContext } from 'react';
import Button from '@mui/material/Button';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import SettingsIcon from '@mui/icons-material/Settings';
import Slider from '@mui/material/Slider';

export default function SettingsPopup() {
  const {layoutSettings, setLayoutSettings}  = useContext(LayoutSettingsContext);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popper' : undefined;
  console.log('LAYOUT SETTINGS', layoutSettings)
  return (
    <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
      <Button variant="contained" onClick={handleClick}>
        <SettingsIcon />
      </Button>
      <Popper id={id} open={open} anchorEl={anchorEl} placement="left-start" style={{ zIndex: 5000 }}>
        <Paper style={{ padding: '10px', borderRadius: '5px', zIndex: 5001, marginRight: '10px', width: '200px', height: '400px' }}>
          {layoutSettings.name === 'fcose' && (
            <div>
              <label>Node Repulsion:</label>
              <Slider
                min={1000}
                max={10000}
                step={100}
                value={layoutSettings.fcose.nodeRepulsion || 4500}
                onChange={(e, val) => setLayoutSettings({
                  ...layoutSettings,
                  fcose: {
                    ...layoutSettings.fcose,
                    nodeRepulsion: val,
                  },
                })}
              />
              {layoutSettings.fcose.nodeRepulsion || 4500}
            </div>
          )}
        </Paper>
      </Popper>
    </div>

  );
}

