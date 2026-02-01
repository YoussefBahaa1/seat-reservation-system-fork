import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip } from '@mui/material';
import FilterEmployee from './FilterEmployee';

function EmployeeTable({ employees, onAction, action, t, onDisableMfa }) {
  const [filterFunction, setFilterFunction] = React.useState(() => (_)=>{return true});

  const filteredEmployees = employees.filter(filterFunction);  
  
  return (
    <>
      <FilterEmployee setFilterFunction={setFilterFunction} />

      <TableContainer component={Paper} style={{ maxHeight: '400px', overflow: 'auto' }}>
        <Table stickyHeader sx={{ minWidth: 550, marginTop: 1, maxHeight:'400px' }}>
          <TableHead sx={{backgroundColor: 'green', color:'white'}}>
            <TableRow>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white'}}>{t("email")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("name")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("surname")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("admin")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>MFA</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }}>{t("visibility")}</TableCell>
              <TableCell sx={{backgroundColor: 'green', textAlign: 'center', fontSize:15, color:'white' }} colSpan={2}>{t("action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((row) => (
              <TableRow id={row.email} key={row.id}>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.email}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.name}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.surname}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.admin ? t('true') : t('false')}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.mfaEnabled ? (
                    <Chip 
                      label={t('mfaEnabled')} 
                      color="success" 
                      size="small"
                      onClick={onDisableMfa ? () => onDisableMfa(row.id) : undefined}
                      onDelete={onDisableMfa ? () => onDisableMfa(row.id) : undefined}
                      title={onDisableMfa ? t('mfaRecovery') : ''}
                    />
                  ) : (
                    <Chip label={t('mfaDisabled')} color="default" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, fontWeight:400 }} >
                  {row.visibility ? t('true') : t('false')}
                </TableCell>
                <TableCell sx={{textAlign: 'center', fontSize:14, width:'25%' }} component="th" scope="row">
                  <Button onClick={() => onAction(row.id)}>{action}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default EmployeeTable;
