import './style.css'
import { supabase } from './supabaseClient.js'

let courses = []
let editingId = null

const $ = (id) => document.getElementById(id)

async function loadCourses() {
  const { data } = await supabase.from('courses').select('*').order('course_name')
  courses = data || []
  $('course').innerHTML = '<option value="">Choose a course</option>' +
    courses.map(c => `<option value="${c.course_id}">${c.course_code} - ${c.course_name}</option>`).join('')
}

async function loadStudents() {
  const term = $('search').value.trim().toLowerCase()
  const { data } = await supabase.from('students').select('*').order('last_name')
  const list = (data || []).filter(s =>
    !term || s.first_name.toLowerCase().includes(term) ||
    s.last_name.toLowerCase().includes(term) ||
    s.student_no.toLowerCase().includes(term)
  )
  $('student-list').innerHTML = list.map(s => `
    <li>${s.student_no} | ${s.first_name} ${s.last_name} | Year ${s.year_level} | ${s.email} | ${s.course}
    <button onclick="window.editStudent(${s.student_id})">Edit</button>
    <button onclick="window.deleteStudent(${s.student_id})">Delete</button></li>
  `).join('') || '<li>No students found.</li>'
}

window.editStudent = async (id) => {
  const { data } = await supabase.from('students').select('*').eq('student_id', id).single()
  if (!data) return
  editingId = id
  $('student-no').value = data.student_no
  $('first-name').value = data.first_name
  $('last-name').value = data.last_name
  $('year-level').value = data.year_level
  $('student-email').value = data.email
  $('course').value = data.course_id
}

window.deleteStudent = async (id) => {
  if (!confirm('Delete this student?')) return
  await supabase.from('students').delete().eq('student_id', id)
  loadStudents()
}

$('save-student').onclick = async () => {
  const courseId = Number($('course').value)
  const course = courses.find(c => c.course_id === courseId)
  if (!course) return alert('Choose a course')
  const payload = {
    student_no: $('student-no').value.trim(),
    first_name: $('first-name').value.trim(),
    last_name: $('last-name').value.trim(),
    year_level: Number($('year-level').value),
    email: $('student-email').value.trim(),
    course: course.course_code,
    course_id: courseId
  }
  let error
  if (editingId) {
    ({ error } = await supabase.from('students').update(payload).eq('student_id', editingId))
  } else {
    ({ error } = await supabase.from('students').insert(payload))
  }
  if (error) return alert(error.message)
  $('message').textContent = 'Saved!'
  editingId = null
  loadStudents()
}

$('login').onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: $('login-email').value, password: $('login-password').value
  })
  if (error) return $('auth-message').textContent = error.message
  checkSession()
}

$('register').onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: $('login-email').value, password: $('login-password').value
  })
  $('auth-message').textContent = error ? error.message : 'Account created. Sign in now.'
}

$('sign-out').onclick = async () => {
  await supabase.auth.signOut()
  checkSession()
}

$('refresh-list').onclick = loadStudents
$('search').oninput = loadStudents
$('clear-form').onclick = () => { editingId = null; document.querySelectorAll('input').forEach(i => i.value = '') }

$('count').onclick = async () => {
  const courseId = Number($('course').value)
  if (!courseId) return alert('Choose a course first')
  const { data, error } = await supabase.rpc('count_students_by_course', { p_course_id: courseId })
  $('report').textContent = error ? error.message : `Total students: ${data}`
}

async function checkSession() {
  const { data } = await supabase.auth.getSession()
  const loggedIn = !!data.session
  $('auth-section').hidden = loggedIn
  $('app-section').hidden = !loggedIn
  if (loggedIn) {
    $('signed-in-as').textContent = `Signed in as ${data.session.user.email}`
    loadCourses(); loadStudents()
  }
}
checkSession()