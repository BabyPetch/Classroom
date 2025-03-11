import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator, // Import ActivityIndicator
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get, set, onValue } from 'firebase/database'; // Import onValue
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import app from './firebase';  // Import Firebase configuration

interface Props {}

const AttendancePage: React.FC<Props> = () => {
    const { courseId } = useLocalSearchParams<{ courseId?: string }>(); // Get courseId
    const [courseData, setCourseData] = useState<{ name: string; classroom: string } | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState('present'); // Default to 'present'
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [attendanceList, setAttendanceList] = useState<string | null>(null);  //Store string
    const [loading, setLoading] = useState(true);
    const [loadingAttendance, setLoadingAttendance] = useState(false); //Separate loading


  const router = useRouter();
  const auth = getAuth(app);
  const db = getDatabase(app);

 useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
          if (!courseId) {
              Alert.alert("Error", "No course selected.");
              router.back(); // Or redirect to a suitable screen
              return;
          }
        await fetchCourseData(courseId);
        // Removed handleAttendance(user.uid); call.  This is now handled on button press
      } else {
          Alert.alert("Error", "Please log in first.");
            router.replace('/');
      }
      setLoading(false); // Stop loading after authentication check
    });
      return () => unsubscribeAuth(); // Cleanup auth listener
  }, [auth, courseId, router]);

  const fetchCourseData = async (id: string) => {

      try {
        const courseRef = ref(db, `courses/${id}`);
        const snapshot = await get(courseRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setCourseData(data);
        } else {
          Alert.alert("Error", "Course data not found.");
            setCourseData(null);
        }
      } catch (error: any) {
        console.error("Error fetching course data:", error);
        Alert.alert("Error", `Failed to fetch course data: ${error.message}`);
      }
  };

  const handleOpenAttendance = () => {
    setIsAttendanceOpen(true);
  };

  const handleCloseAttendance = () => {
    setIsAttendanceOpen(false);
  };

 const handleShowAttendance = async () => {
     setLoadingAttendance(true); // Start loading
    try {
        if (!courseId) {
            Alert.alert("Error", "Course ID is missing.");
            setAttendanceList(null)
            return;
        }
        const attendanceRef = ref(db, `attendances/${courseId}`);
        const snapshot = await get(attendanceRef);  // Use a one-time 'get'
        if (snapshot.exists()) {
            let listContent = '';
            const data = snapshot.val();
             for (let date in data) {
                listContent += `\n${date}\n`; // Use \n for newlines in React Native Text
                for (let userId in data[date]) {  // Corrected: iterate over userId
                   const userRef = ref(db, `users/${userId}`); //Get userName
                    const userSnapshot = await get(userRef);
                    const userData = userSnapshot.val();
                    const userName = userData ? userData.displayName || 'Unknown User' : 'Unknown User'; //display Name
                  listContent += `${userName}: ${data[date][userId]}\n`; // Display user's status
                }
              }
            setAttendanceList(listContent);

        } else {
            setAttendanceList("No attendance data found.");
        }
    } catch (error: any) {
        console.error("Error fetching attendance data:", error);
        Alert.alert("Error", `Failed to fetch attendance: ${error.message}`);
        setAttendanceList(null);
    } finally {
        setLoadingAttendance(false)
    }
};


  const handleAttendanceSubmit = async () => {
      try {
          const user = auth.currentUser;
          if (!user) {
              Alert.alert("Error", "User not signed in.");
              return;
          }

          if (!courseId) {
              Alert.alert("Error", "No course selected.");
              return;
          }

          const today = new Date().toLocaleDateString();
          const attendanceRef = ref(db, `attendances/${courseId}/${today}/${user.uid}`);
          await set(attendanceRef, attendanceStatus);
          Alert.alert("Success", "Attendance recorded successfully!");
          // No need to navigate here; stay on the same page
      } catch (error: any) {
          console.error("Error submitting attendance:", error);
          Alert.alert("Error", `Failed to submit attendance: ${error.message}`);
      }
    };

    if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2CBFAE" />
      </View>
    );
  }


  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.header}>Attendance System</Text>

        <View style={styles.courseInfo}>
          <Text style={styles.courseInfoHeader}>Course Information</Text>
          {courseData ? (
            <>
              <Text style={styles.courseName}>{courseData.name}</Text>
              <Text style={styles.classroom}>Classroom: {courseData.classroom}</Text>
            </>
          ) : (
            <Text>Loading course data...</Text>
          )}
        </View>

        <View style={styles.attendanceSection}>
          <TouchableOpacity
            style={[styles.button, !isAttendanceOpen ? styles.activeButton : null]}
            onPress={handleOpenAttendance}
            disabled={isAttendanceOpen}
          >
            <Text style={styles.buttonText}>Open Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isAttendanceOpen ? styles.activeButton : null]}
            onPress={handleCloseAttendance}
            disabled={!isAttendanceOpen}
          >
            <Text style={styles.buttonText}>Close Attendance</Text>
          </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, isAttendanceOpen ? styles.activeButton : null]}  // Apply active style if open
                onPress={handleShowAttendance}
              >
                <Text style={styles.buttonText}>Show Attendance</Text>
              </TouchableOpacity>
        </View>

        {isAttendanceOpen && (
          <View style={styles.form}>
            <Text style={styles.formLabel}>Status:</Text>
             <Picker
                selectedValue={attendanceStatus}
                style={styles.picker}
                onValueChange={(itemValue) => setAttendanceStatus(itemValue)}
                >
                <Picker.Item label="Present" value="present" />
                <Picker.Item label="Absent" value="absent" />
                <Picker.Item label="Excused" value="excused" />
            </Picker>
            <TouchableOpacity style={styles.button} onPress={handleAttendanceSubmit}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        )}

          {loadingAttendance ? (
            <ActivityIndicator size="small" color="#2CBFAE" />
          ) : (
            attendanceList && <Text style={styles.attendanceList}>{attendanceList}</Text>
          )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
   container: {
    flex: 1,
    backgroundColor: '#E0E7E9',
  },
  contentContainer: {
    width: '90%', // Responsive width
    margin: 20, // Add margin
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10, // Add border radius
     // Add shadow for better UI
    ...Platform.select({ // Platform-specific shadows
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    backgroundColor: '#2CBFAE',
    padding: 20,
    textAlign: 'center',
    color: 'white',
    fontSize: 24,
    borderRadius: 10, // Add to match container
    marginBottom: 20
  },
  courseInfo: {
    marginBottom: 20, // Consistent spacing
  },
  courseInfoHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  courseName: {
    fontSize: 16,
    marginBottom: 5,
  },
  classroom: {
    fontSize: 16,
  },
  attendanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Space out buttons evenly
    marginBottom: 20, // Add spacing before form
  },
    activeButton: {
    backgroundColor: '#4CAF50', // A different color for active state
  },
  button: {
    padding: 10,
    margin: 5, // Consistent margin
    borderWidth: 0,
    backgroundColor: '#2CBFAE',
    color: 'white',
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center', // Ensure text is centered
      fontSize: 16,
    fontWeight: 'bold'

  },
  form: {
    marginBottom: 20, // Add space above attendance list
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 10,
     borderWidth: 1,      // Add border
    borderColor: '#ddd', // Light grey border
    borderRadius: 5,     // Rounded corners
  },
   attendanceList: {
    marginTop: 10,
    padding: 10,
    borderColor: '#ddd', // Light grey border
    borderWidth: 1,
    borderRadius: 5,
      whiteSpace: 'pre-wrap', // Preserve newlines and spacing
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

});

export default AttendancePage;