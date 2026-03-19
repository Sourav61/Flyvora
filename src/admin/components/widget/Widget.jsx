import "./widget.scss";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';

const Widget = ({ type, customAmount, diff }) => {
  let data;

  switch (type) {
    case "user":
      data = {
        title: "ACTIVE USERS",
        isMoney: false,
        link: "See all users",
        href: "/admin/users",
        icon: (
          <PersonOutlinedIcon
            className="icon"
            style={{
              color: "crimson",
              backgroundColor: "rgba(255, 0, 0, 0.1)",
            }}
          />
        ),
      };
      break;
    case "flight":
      data = {
        title: "TOTAL FLIGHTS",
        isMoney: false,
        link: "View flights",
        href: "/admin/flights",
        icon: (
          <FlightTakeoffIcon
            className="icon"
            style={{
              backgroundColor: "rgba(116, 81, 248, 0.1)",
              color: "var(--color-primary)",
            }}
          />
        ),
      };
      break;
    case "order":
      data = {
        title: "FLIGHT BOOKINGS",
        isMoney: false,
        link: "View all bookings",
        href: "/admin/bookings",
        icon: (
          <ShoppingCartOutlinedIcon
            className="icon"
            style={{
              backgroundColor: "rgba(218, 165, 32, 0.1)",
              color: "goldenrod",
            }}
          />
        ),
      };
      break;
    case "earning":
      data = {
        title: "GROSS EARNINGS",
        isMoney: true,
        link: "View net earnings",
        href: "#",
        icon: (
          <MonetizationOnOutlinedIcon
            className="icon"
            style={{ backgroundColor: "rgba(0, 128, 0, 0.1)", color: "#10b981" }}
          />
        ),
      };
      break;
    default:
      break;
  }

  return (
    <div className="widget">
      <div className="left">
        <span className="title">{data.title}</span>
        <span className="counter">
          {data.isMoney && "$"} {customAmount?.toLocaleString() || 0}
        </span>
        <a href={data.href} className="link">{data.link}</a>
      </div>
      <div className="right">
        <div className={`percentage ${diff >= 0 ? 'positive' : 'negative'}`}>
          {diff >= 0 ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          {Math.abs(diff)} %
        </div>
        {data.icon}
      </div>
    </div>
  );
};

export default Widget;
