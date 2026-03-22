const centeredCell = (value) => <div className="table-cell-center">{value}</div>;

export const ticketColumns = [
  {
    field: "id",
    headerName: "ID",
    width: 300,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params.row.id),
  },
  {
    field: "email",
    headerName: "email",
    width: 150,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.email),
  },
  {
    field: "flightId",
    headerName: "Flight Id",
    width: 300,
    headerAlign: "center",
    renderCell: (params) => centeredCell(params?.row?.flightId),
  },
];
