import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';

function BookingTable({ bookings, onAction, action }) {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 450, marginTop: 1, maxHeight: '400px' }}>
        <TableHead sx={{ backgroundColor: 'green', color: 'white' }}>
          <TableRow>
            <TableCell sx={{ textAlign: 'center', fontSize: 15, color: 'white' }}> ID</TableCell>
            <TableCell sx={{ textAlign: 'center', fontSize: 15, color: 'white' }}> USER</TableCell>
            <TableCell sx={{ textAlign: 'center', fontSize: 15, color: 'white' }}> ROOM ID</TableCell>
            <TableCell sx={{ textAlign: 'center', fontSize: 15, color: 'white' }}> DESK ID</TableCell>
            <TableCell sx={{ textAlign: 'center', fontSize: 15, color: 'white' }}> DATE</TableCell>
            <TableCell sx={{ textAlign: 'center', fontSize: 15, color: 'white' }}> BEGIN</TableCell>
            <TableCell sx={{ textAlign: 'center', fontSize: 15, color: 'white' }}> END</TableCell>
            <TableCell sx={{ textAlign: 'center', fontSize: 15, color: 'white' }} colSpan={2}>ACTION</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bookings && bookings.length > 0 && bookings.map((row) => (
            <TableRow key={row.id}>
              <TableCell sx={{ textAlign: 'center', fontSize: 14, fontWeight: 400 }} component="th" scope="row">
                {row.id}
              </TableCell>
              <TableCell sx={{ textAlign: 'center', fontSize: 14, fontWeight: 400 }} >
                {row.user.name + " " + row.user.surname}
              </TableCell>
              <TableCell sx={{ textAlign: 'center', fontSize: 14, fontWeight: 400 }} >
                {row.room.id}
              </TableCell>
              <TableCell sx={{ textAlign: 'center', fontSize: 14, fontWeight: 400 }} >
                {row.desk.id}
              </TableCell>
              <TableCell sx={{ textAlign: 'center', fontSize: 14, fontWeight: 400 }} >
                {row.day}
              </TableCell>
              <TableCell sx={{ textAlign: 'center', fontSize: 14, fontWeight: 400 }} >
                {row.begin}
              </TableCell>
              <TableCell sx={{ textAlign: 'center', fontSize: 14, fontWeight: 400 }} >
                {row.end}
              </TableCell>
              <TableCell sx={{ textAlign: 'center', fontSize: 14, width: '30%' }} component="th" scope="row">
                <Button onClick={() => onAction(row.id)}>{action}</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default BookingTable;