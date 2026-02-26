import { createSlice } from '@reduxjs/toolkit';

/** @type {{ team: { leader: object|null, information: { employee: number } } }} */
const initialState = {
  team: {
    leader: null,
    information: {
      employee: 0,
    },
  },
};

export const teamSlice = createSlice({
    name:'teamSlice',
    initialState,
    reducers:{
        setTeam:(state,action) =>
        {
            state.team = action.payload;
        },
        setTeamLeader : (state,action) =>
        {
            state.team.leader = action.payload;
        },
        setTeamInformation:(state,action) =>
        {
            state.team.information = action.payload;
        },
        updateEmployeeCount : (state,action) =>
        {
            if(action.payload==='INCREMENT')
                state.team.information.employee = state.team.information.employee+1;
            else if(action.payload==='DECREMENT')
            {
                state.team.information.employee = state.team.information.employee-1;
            }

        }
    }
})


export const {setTeam,setTeamInformation,updateEmployeeCount,setTeamLeader} = teamSlice.actions;
export default teamSlice.reducer;