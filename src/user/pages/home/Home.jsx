import React, { useEffect, useState } from 'react'
import Navbar from '../../components/navbar/Navbar'
import "./home.scss"
import { Box, Button, Grid } from "@mui/material";
import SimpleSelectMenu from "../../components/SimpleSelectMenu";
import BagsSelectMenu from "../../components/BagsSelectMenu";
import { db } from '../../../admin/firebase-config';
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from '@firebase/firestore';
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid } from '@mui/x-data-grid';
import { userColumns } from "../../../admin/datatablesource";
import DateComponent from '../../components/DateComponent';
import { useDispatch, useSelector } from 'react-redux';
import { updateSeatCount } from '../../../Redux/actions/productAction';
import { useAuth0 } from "@auth0/auth0-react";

const Home = () => {
    const [data, setData] = useState([])
    const [type, setType] = useState("");
    const [category, setCategory] = useState("economy");
    const [bookings, setBookings] = useState([])

    const { arrivalTime, departureTime } = useSelector((state) => state.time);
    const { seats } = useSelector((state) => state.details);
    const dispatch = useDispatch();

    const { user } = useAuth0();

    useEffect(() => {
        const usersCollectionRef = collection(db, "flights");

        const getBookings = async () => {
            const bookingsRef = collection(db, "bookings");

            const booking = await getDocs(bookingsRef);
            setBookings(booking.docs.map(doc => ({ ...doc.data(), id: doc.id })))
        }

        getBookings();

        const getFlightDetails = async () => {
            const data = await getDocs(usersCollectionRef);
            setData(data?.docs?.map(doc => ({ ...doc.data(), id: doc.id })))
        }

        getFlightDetails();
    }, [])

    const compareDates = (t1, t2, ignoreTime = true)/*: number*/ => {
        const MS_PER_HOUR = 60 * 60 * 1000;
        const a = new Date(t1);
        const b = new Date(t2);
        const diffInMs = a.getTime() - b.getTime();
        return Math.round(diffInMs / MS_PER_HOUR);
    };

    const handleClick = async () => {
        var result = [];
        const ref = collection(db, "flights");

        if (compareDates(arrivalTime, departureTime) <= 0) {
            const q = query(ref, where("seats", "<=", seats));

            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                let obj = Object.assign(doc.data(), { id: doc.id });
                result.push(obj);
            });
        } else {
            const q = query(ref, where("departure", ">=", departureTime));

            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((doc) => {
                let obj = Object.assign(doc.data(), { id: doc.id });

                if (doc.data().arrival <= arrivalTime && seats <= doc.data().seats) {
                    result.push(obj);
                }
            });
        }

        setData(result);
    };

const bookTicket = async (params) => {
        if (!user || !user.email) {
            alert("Please log in as a Traveler to book flights!");
            return;
        }

        const id = params?.row?.id;
        const currentSeats = params?.row?.seats;

        if (currentSeats <= 0) {
            alert("Sorry, this flight is fully booked!");
            return;
        }

        try {
            const flightDoc = doc(db, "flights", id);
            const newFields = { seats: currentSeats - 1 };
            await updateDoc(flightDoc, newFields);

            const bookingsRef = collection(db, "bookings");
            const arr = bookings.filter((el) => el?.email === user?.email);

            if (Object.keys(arr).length > 0) {
                const bookingDoc = doc(db, "bookings", arr[0].id);
                const temp = [...arr[0].bookings, id];
                await updateDoc(bookingDoc, { bookings: temp });
            } else {
                await addDoc(bookingsRef, {
                    email: user.email,
                    bookings: [id]
                });
            }

            // Update local state to reflect the seat change
            setData(prevData => prevData.map(flight => 
                flight.id === id ? { ...flight, seats: currentSeats - 1 } : flight
            ));

            alert("Ticket booked successfully! Enjoy your trip.");
        } catch (error) {
            console.error("Error booking ticket: ", error);
            alert("There was an issue booking your ticket. Please try again.");
        }
    };

    const statusColumn = [
        {
            field: "status",
            headerName: "status",
            width: 80,
            headerAlign: 'center',
            renderCell: (params) => {
                return (
                    <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
                        <button
                            onClick={() => bookTicket(params)}
                            style={{
                                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                                padding: "6px 14px",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "600",
                                boxShadow: "0 4px 10px rgba(116, 81, 248, 0.3)"
                            }}>Book</button>
                    </div>
                );
            },
        }
    ];

    return (
        <div className='home'>
            <Navbar />
            <div className="hero-section">
                <div className="hero-content">
                    <h1>Where will your next adventure begin?</h1>
                    <p>Discover unseen places, experience untouched beauty, and create unforgettable memories with our premium booking experience.</p>
                </div>
            </div>
            
            <div className='main'>
                <div className="search-panel glassmorphism">
                    <div className="filters">
                        <Box sx={{ flexGrow: 1, marginTop: "10px" }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={3} lg={3}>
                                    <SimpleSelectMenu
                                        options={["One-way", "Round-trip", "Multi-city"]}
                                        label={"Flights"}
                                        setType={setType}
                                        type={type}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3} lg={3}>
                                    <input placeholder="Adults" type="number" name="Adults" className="adults" value={seats} onChange={(e) => dispatch(updateSeatCount(e.target.value))} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3} lg={3}>
                                    <SimpleSelectMenu
                                        options={["Economy", "Premium Economy", "Business", "First"]}
                                        label={"Class"}
                                        setCategory={setCategory}
                                        category={category}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3} lg={3}>
                                    <BagsSelectMenu options={["Carry-on", "Checked"]} label={"Bags"} />
                                </Grid>
                            </Grid>
                        </Box>
                    </div>
                    
                    <Box mt={3} mb={1}>
                        <DateComponent />
                    </Box>
                    
                    <div className="search">
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }} fullWidth>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={() => handleClick()}
                                sx={{
                                    background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                                    maxWidth: "400px",
                                }}
                                startIcon={<SearchIcon />}
                            >
                                Search Flights
                            </Button>
                        </Box>
                    </div>
                </div>

                <div className="results">
                    <div className="datatable custom-datagrid">
                        <DataGrid
                            className="datagrid"
                            rows={data}
                            columns={userColumns?.concat(statusColumn)}
                            pageSize={9}
                            rowsPerPageOptions={[9]}
                            checkboxSelection
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home