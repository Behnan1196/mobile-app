import { supabase } from './supabase';
import { User } from '../types';

export interface Assignment {
  id: string;
  student_id: string;
  coach_id: string;
  created_at: string;
  student?: User;
  coach?: User;
}

export const getAssignedPartner = async (userId: string, userRole: 'student' | 'coach'): Promise<User | null> => {
  try {
    console.log(`Fetching assigned partner for ${userRole} with ID: ${userId}`);
    
    if (userRole === 'student') {
      // Get the coach assigned to this student
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('student_coach_assignments')
        .select('*')
        .eq('student_id', userId)
        .single();

      if (assignmentError) {
        console.error('Error fetching coach assignment:', assignmentError);
        return null;
      }

      console.log('Coach assignment data:', assignmentData);

      // Now fetch the coach user data separately
      const { data: coachData, error: coachError } = await supabase
        .from('users')
        .select('*')
        .eq('id', assignmentData.coach_id)
        .single();

      if (coachError) {
        console.error('Error fetching coach user data:', coachError);
        return null;
      }

      console.log('Coach user data:', coachData);
      return coachData;
    } else {
      // Get the student assigned to this coach
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('student_coach_assignments')
        .select('*')
        .eq('coach_id', userId)
        .single();

      if (assignmentError) {
        console.error('Error fetching student assignment:', assignmentError);
        return null;
      }

      console.log('Student assignment data:', assignmentData);

      // Fetch the student user data
      const { data: studentData, error: studentError } = await supabase
        .from('users')
        .select('*')
        .eq('id', assignmentData.student_id)
        .single();

      if (studentError) {
        console.error('Error fetching student user data:', studentError);
        console.error('Student ID we tried to fetch:', assignmentData.student_id);
        
        // Check if the user exists at all
        const { data: userCheck, error: checkError } = await supabase
          .from('users')
          .select('id, email, name, role')
          .eq('id', assignmentData.student_id);
        
        if (checkError) {
          console.error('Error checking if user exists:', checkError);
        } else {
          console.log('User check result:', userCheck);
          if (userCheck && userCheck.length === 0) {
            console.error('User with ID does not exist in users table!');
            
            // Let's also check what users DO exist
            const { data: allUsers, error: allUsersError } = await supabase
              .from('users')
              .select('id, email, name, role');
            
            if (allUsersError) {
              console.error('Error fetching all users:', allUsersError);
            } else {
              console.log('All users in database:', allUsers);
            }
          }
        }
        
        return null;
      }

      console.log('Student user data:', studentData);
      return studentData;
    }
  } catch (error) {
    console.error('Error in getAssignedPartner:', error);
    return null;
  }
};

export const getAllAssignments = async (): Promise<Assignment[]> => {
  try {
    const { data: assignments, error: assignmentError } = await supabase
      .from('student_coach_assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
      return [];
    }

    // Fetch user data for each assignment separately
    const assignmentsWithUsers = await Promise.all(
      (assignments || []).map(async (assignment) => {
        const [studentData, coachData] = await Promise.all([
          supabase.from('users').select('*').eq('id', assignment.student_id).single(),
          supabase.from('users').select('*').eq('id', assignment.coach_id).single()
        ]);

        return {
          ...assignment,
          student: studentData.data,
          coach: coachData.data
        };
      })
    );

    return assignmentsWithUsers;
  } catch (error) {
    console.error('Error in getAllAssignments:', error);
    return [];
  }
};
