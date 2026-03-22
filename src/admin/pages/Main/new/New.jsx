import "./new.scss";
import Sidebar from "../../../components/sidebar/Sidebar";
import Navbar from "../../../components/navbar/Navbar";
import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../../firebase-config";
import { useNavigate } from "react-router";

const New = ({ inputs, title }) => {
  const [file, setFile] = useState("");
  const [airlines, setAirlines] = useState("");
  const [seats, setSeats] = useState(60);
  const [category, setCategory] = useState("economy");
  const [price, setPrice] = useState(3000);
  const [stops, setStops] = useState(0)
  const [departure, setDeparture] = useState(new Date().getTime());
  const [arrival, setArrival] = useState(new Date().getTime());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const usersCollectionRef = collection(db, "flights");
  const navigate = useNavigate();

  const addFlight = async () => {
    await addDoc(usersCollectionRef, {
      airlines,
      category,
      seats,
      price,
      stops,
      departure,
      arrival,
      from,
      to,
    })

    navigate(-1)
  }

  return (
    <div className="new">
      <Sidebar />
      <div className="newContainer">
        <Navbar />
        <div className="top">
          <h1>{title}</h1>
        </div>
        <div className="bottom">
          <div className="left">
            <img
              src={
                file
                  ? URL.createObjectURL(file)
                  : "https://icon-library.com/images/no-image-icon/no-image-icon-0.jpg"
              }
              alt=""
            />
          </div>
          <div className="right">
            <form>

              <div className="form">

                <div className="formInput formInput--hidden-file">
                  <label htmlFor="file">
                    Image: <DriveFolderUploadOutlinedIcon className="icon" />
                  </label>
                  <input
                    type="file"
                    id="file"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </div>
                <div className="formInput">
                  <label>Airlines</label>
                  <input type="text" placeholder="IndiGo" onChange={(e) => setAirlines(e.target.value)} />
                </div>

                <div className="formInput">
                  <label>Maximum Seats</label>
                  <input type="Number" placeholder={60} onChange={(e) => setSeats(e.target.value)} />
                </div>
                <div className="formInput">
                  <label>Category</label>
                  <input type="text" placeholder={"Economy"} onChange={(e) => setCategory(e.target.value)} />
                </div>
                <div className="formInput">
                  <label>Price</label>
                  <input type="Number" placeholder={3000} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="formInput">
                  <label>No. of Stops</label>
                  <input type="Number" placeholder={0} onChange={(e) => setStops(e.target.value)} />
                </div>
                <div className="formInput">
                  <label>From</label>
                  <input type="text" placeholder={"Mumbai"} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="formInput">
                  <label>To</label>
                  <input type="text" placeholder={"New Delhi"} onChange={(e) => setTo(e.target.value)} />
                </div>
                <div className="formInput">
                  <label>Departure</label>
                  <input type="datetime-local" onChange={(e) => setDeparture(new Date(e.target.value).getTime())} />
                </div>
                <div className="formInput">
                  <label>Arrival</label>
                  <input type="datetime-local" onChange={(e) => setArrival(new Date(e.target.value).getTime())} />
                </div>
                <button className="createUser" onClick={() => addFlight()}>Send</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default New;
