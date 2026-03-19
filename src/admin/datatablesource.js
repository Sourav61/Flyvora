export const userColumns = [
  {
    field: "id", headerName: "ID",
    width: 50,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params.row.id}
        </div>
      );
    },
  },
  {
    field: "type", headerName: "type",
    width: 70,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.type}
        </div>
      );
    },
  },
  {
    field: "airlines", headerName: "Airlines",
    width: 70,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.airlines}
        </div>
      );
    },
  },
  {
    field: "Arrival",
    headerName: "Arrival",
    width: 130,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.arrival ? `${new Date(params?.row?.arrival)?.toISOString()?.substring(0, 10)} ${new Date().getHours()}:${new Date().getMinutes()}` : new Date()?.toISOString()?.substring(0, 10)}
        </div>
      );
    },
  },

  {
    field: "Departure",
    headerName: "Departure",
    width: 130,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.departure ? `${new Date(params?.row?.departure)?.toISOString()?.substring(0, 10)} ${new Date().getHours()}:${new Date().getMinutes()}` : new Date()?.toISOString()?.substring(0, 10)}
        </div>
      );
    },
  },
  {
    field: "from", headerName: "From",
    width: 80,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.from}
        </div>
      );
    },
  },
  {
    field: "to", headerName: "To",
    width: 80,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.to}
        </div>
      );
    },
  },
  {
    field: "stops", headerName: "Stops",
    width: 80,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.stops === 0 ? 'Non-Stop' : params?.row?.stops}
        </div>
      );
    },
  },
  {
    field: "seats", headerName: "seats",
    width: 80,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.seats === 0 ? 'Seats Full' : params?.row?.seats}
        </div>
      );
    },
  },
  {
    field: "price", headerName: "Price",
    width: 80,
    headerAlign: 'center',
    renderCell: (params) => {
      return (
        <div style={{ display: 'flex', justifyContent: "center", alignItems: "center", flex: 1 }}>
          {params?.row?.price}
        </div>
      );
    },
  },
];

//temporary data
export const userRows = [
  {
    id: 1,
    username: "Snow",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    status: "active",
    email: "1snow@gmail.com",
    age: 35,
  },
  {
    id: 2,
    username: "Jamie Lannister",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "2snow@gmail.com",
    status: "passive",
    age: 42,
  },
  {
    id: 3,
    username: "Lannister",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "3snow@gmail.com",
    status: "pending",
    age: 45,
  },
  {
    id: 4,
    username: "Stark",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "4snow@gmail.com",
    status: "active",
    age: 16,
  },
  {
    id: 5,
    username: "Targaryen",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "5snow@gmail.com",
    status: "passive",
    age: 22,
  },
  {
    id: 6,
    username: "Melisandre",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "6snow@gmail.com",
    status: "active",
    age: 15,
  },
  {
    id: 7,
    username: "Clifford",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "7snow@gmail.com",
    status: "passive",
    age: 44,
  },
  {
    id: 8,
    username: "Frances",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "8snow@gmail.com",
    status: "active",
    age: 36,
  },
  {
    id: 9,
    username: "Roxie",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "snow@gmail.com",
    status: "pending",
    age: 65,
  },
  {
    id: 10,
    username: "Roxie",
    img: "https://images.pexels.com/photos/1820770/pexels-photo-1820770.jpeg?auto=compress&cs=tinysrgb&dpr=2&w=500",
    email: "snow@gmail.com",
    status: "active",
    age: 65,
  },
];
