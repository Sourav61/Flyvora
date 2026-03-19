import React, { useEffect, useState } from 'react'
import Navbar from '../navbar/Navbar'
import { DataGrid } from '@mui/x-data-grid'
import { userColumns } from '../../../admin/datatablesource'
import { db } from '../../../admin/firebase-config'
import { collection, getDocs } from '@firebase/firestore'
import { useAuth0 } from '@auth0/auth0-react'

const BookingList = () => {
    const [bookings, setBookings] = useState([])
    const [data, setData] = useState([])
    const { user } = useAuth0();


    useEffect(() => {
        const getBookings = async () => {
            const bookingsRef = collection(db, "bookings");

            const booking = await getDocs(bookingsRef);
            console.log('clggggg', booking.docs);
            setBookings(booking.docs.map(doc => ({ ...doc.data(), id: doc.id })))
        }

        getBookings();

        const usersCollectionRef = collection(db, "flights")

        const getFlightDetails = async () => {
            const data = await getDocs(usersCollectionRef);
            setData(data?.docs?.map(doc => ({ ...doc.data(), id: doc.id })))
        }

        getFlightDetails();


    }, [])

    function bookedTickets() {
        if (!user || !user.email) return [];
        const arr = bookings.filter((el) => el?.email === user?.email);
        if (!arr.length) return [];

        const namesToDeleteSet = new Set(arr[0]?.bookings || []);

        return data.filter((name) => namesToDeleteSet.has(name?.id));
    }

    return (
        <div className="home">
            <Navbar />
            <div className="main">
                <div style={{ marginTop: '20px', padding: '20px' }} className="glassmorphism">
                    <h2 style={{ color: "var(--color-white)", marginBottom: '20px' }}>Your Booked Flights</h2>
                    <div style={{ height: 600, width: '100%' }} className="custom-datagrid">
                        <DataGrid
                            className="datagrid"
                            rows={bookedTickets()}
                            columns={userColumns}
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

export default BookingList