import "./navbar.scss";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import { useNavigate } from "react-router-dom";
import { useAdminSession } from "../../auth/AdminSessionContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { admin, adminName, isAuthenticated, logout } = useAdminSession();

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="navbar">

      <div className="wrapper">
        <div className="search">
          <input type="text" placeholder="Search..." />
          <SearchOutlinedIcon />
        </div>
        <div className="items">
          <div className="item">
            <LanguageOutlinedIcon className="icon" />
            English
          </div>
          {/* <div className="item">
            <FullscreenExitOutlinedIcon className="icon" />
          </div>
          <div className="item">
            <NotificationsNoneOutlinedIcon className="icon" />
            <div className="counter">1</div>
          </div>
          <div className="item">
            <ChatBubbleOutlineOutlinedIcon className="icon" />
            <div className="counter">2</div>
          </div>
          <div className="item">
            <ListOutlinedIcon className="icon" />
          </div> */}
          <div className="item">
            {isAuthenticated &&
              <div className="user-info">
                <div className="avatar avatar--fallback" aria-hidden="true">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <p className="p-login">
                  {admin?.email || adminName}
                </p>
              </div>
            }
            <button className="btn-logout" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Navbar;
