import React, { useState, useEffect } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import './ManageUsers.css';

const userSchema = Yup.object().shape({
  username: Yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: Yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  role: Yup.string()
    .required('Role is required')
    .oneOf(['shipper', 'driver', 'admin'], 'Invalid role')
});

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users. Please try again.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (values, { setSubmitting, resetForm }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:3001/register',
        values,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchUsers();
      setShowAddForm(false);
      resetForm();
    } catch (err) {
      setError('Failed to create user. Please try again.');
      console.error('Error creating user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="manage-users-container">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="manage-users-container">
      <div className="users-header">
        <h1>Manage Users</h1>
        <button
          className="add-button"
          onClick={() => setShowAddForm(true)}
        >
          Add New User
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {showAddForm && (
        <div className="form-section">
          <h2>Add New User</h2>
          <Formik
            initialValues={{
              username: '',
              password: '',
              role: ''
            }}
            validationSchema={userSchema}
            onSubmit={handleCreateUser}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form className="user-form">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <Field
                    type="text"
                    name="username"
                    className={`form-control ${
                      errors.username && touched.username ? 'is-invalid' : ''
                    }`}
                    placeholder="Enter username"
                  />
                  {errors.username && touched.username && (
                    <div className="error-message">{errors.username}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <Field
                    type="password"
                    name="password"
                    className={`form-control ${
                      errors.password && touched.password ? 'is-invalid' : ''
                    }`}
                    placeholder="Enter password"
                  />
                  {errors.password && touched.password && (
                    <div className="error-message">{errors.password}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <Field
                    as="select"
                    name="role"
                    className={`form-control ${
                      errors.role && touched.role ? 'is-invalid' : ''
                    }`}
                  >
                    <option value="">Select a role</option>
                    <option value="shipper">Shipper</option>
                    <option value="driver">Driver</option>
                    <option value="admin">Admin</option>
                  </Field>
                  {errors.role && touched.role && (
                    <div className="error-message">{errors.role}</div>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {users.length === 0 ? (
        <div className="no-users">
          <p>No users found.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>#{user.id}</td>
                  <td>{user.username}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageUsers; 