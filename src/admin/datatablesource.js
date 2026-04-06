const centeredCell = (value) => <div className="table-cell-center">{value}</div>;

export const userColumns = [
  {
    field: "id",
    headerName: "ID",
    width: 50,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params.row.id),
  },
  {
    field: "type",
    headerName: "type",
    width: 70,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.type),
  },
  {
    field: "airlines",
    headerName: "Airlines",
    width: 70,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.airlines),
  },
  {
    field: "Arrival",
    headerName: "Arrival",
    width: 130,
    headerAlign: "center",
    renderCell: (params) =>
      centeredCell(
        params?.row?.arrival
          ? `${new Date(params?.row?.arrival)?.toISOString()?.substring(0, 10)} ${new Date().getHours()}:${new Date().getMinutes()}`
          : new Date()?.toISOString()?.substring(0, 10)
      ),
  },
  {
    field: "Departure",
    headerName: "Departure",
    width: 130,
    headerAlign: "center",
    renderCell: (params) =>
      centeredCell(
        params?.row?.departure
          ? `${new Date(params?.row?.departure)?.toISOString()?.substring(0, 10)} ${new Date().getHours()}:${new Date().getMinutes()}`
          : new Date()?.toISOString()?.substring(0, 10)
      ),
  },
  {
    field: "from",
    headerName: "From",
    width: 80,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.from),
  },
  {
    field: "to",
    headerName: "To",
    width: 80,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.to),
  },
  {
    field: "stops",
    headerName: "Stops",
    width: 80,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.stops === 0 ? "Non-Stop" : params?.row?.stops),
  },
  {
    field: "seats",
    headerName: "seats",
    width: 80,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.seats === 0 ? "Seats Full" : params?.row?.seats),
  },
  {
    field: "price",
    headerName: "Price",
    width: 80,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.price),
  },
];
