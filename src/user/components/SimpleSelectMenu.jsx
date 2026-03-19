import * as React from "react";
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { useEffect } from "react";


export default function BasicSelect(props) {
  const { options, label } = props;
  const [option, setOption] = React.useState("");
  useEffect(() => {
    setOption(options[0])
  }, [options])

  // const handleClick = (index) => {
  //   setOption(options[index]);
  //   if (label === "Flights") {
  //     switch (index) {
  //       case 0:
  //         dispatch(setTripType(1));
  //         break;
  //       case 1:
  //         dispatch(setTripType(2));
  //         break;
  //       case 2:
  //         dispatch(setTripType(3));
  //         break;
  //       case 3:
  //         dispatch(setTripType(4));
  //         break;
  //       default:
  //         break;
  //     }
  //   } else {
  //     switch (index) {
  //       case 0:
  //         dispatch(setEconomy());
  //         break;
  //       case 1:
  //         dispatch(setPremiumEconomy());
  //         break;
  //       case 2:
  //         dispatch(setBusiness());
  //         break;
  //       case 3:
  //         dispatch(setFirstClass());
  //         break;
  //       case 4:
  //         dispatch(setMultiple());
  //         break;
  //       default:
  //         break;
  //     }
  //   }
  // };

  return (
    <Box>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">{label}</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={option}
          label="Option"
        >
          {options.map((option) => (
            <MenuItem
              onClick={() => {
                // handleClick(options.indexOf(option));
              }}
              value={option}
            >
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box >
  );
}
