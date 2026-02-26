import { createSlice } from '@reduxjs/toolkit';

/** @type {{ counts: { admin: number, team: number, leader: number, employee: number }, employees: Array|null }} */
const initialState = {
  counts: {
    admin: 0,
    team: 0,
    leader: 0,
    employee: 0,
  },
  employees: null,
};

export const mainSlice = createSlice({
    name:'mainSlice',
    initialState,
    reducers:{
        setCount:(state,action)=>
        {
            const counts = action.payload;
            state.counts = counts;
        },
        setEmployees:(state,action) =>
        {
            const employees = action.payload;
            state.employees = employees;
        }
    }
})

export const {setCount,setEmployees} = mainSlice.actions;
export default mainSlice.reducer;