import React, { useState, useEffect, useMemo } from 'react';
import { useTable, useSortBy, useGlobalFilter } from 'react-table';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import './ManageUsers.css';
import { Link } from 'react-router-dom';
import { API_URL } from '../utils/api';

const userSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .required('Username is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  role: Yup.string()
    .oneOf(['shipper', 'driver', 'admin'], 'Invalid role')
    .required('Role is required'),
  name: Yup.string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters'),
});

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users`, {
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (values, { setSubmitting, resetForm }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/register`,
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

  const handleUpdateUser = async (values, { setSubmitting }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/users/${editingUser.id}`,
        values,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      setError('Failed to update user. Please try again.');
      console.error('Error updating user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/users/${deletingUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchUsers();
      setDeletingUser(null);
    } catch (err) {
      setError('Failed to delete user. Please try again.');
      console.error('Error deleting user:', err);
    }
  };

  const columns = useMemo(
    () => [
      {
        Header: 'ID',
        accessor: 'id',
        Cell: ({ value }) => `#${value}`
      },
      {
        Header: 'Name',
        accessor: 'name',
        Cell: ({ value }) => value || 'Not set'
      },
      {
        Header: 'Username',
        accessor: 'username'
      },
      {
        Header: 'Role',
        accessor: 'role',
        Cell: ({ value }) => (
          <span className={`role-badge ${value}`}>
            {value}
          </span>
        )
      },
      {
        Header: 'Actions',
        Cell: ({ row }) => (
          <div className="action-buttons">
            <button
              onClick={() => setEditingUser(row.original)}
              className="action-button edit"
            >
              Edit
            </button>
            <button
              onClick={() => setDeletingUser(row.original)}
              className="action-button delete"
              disabled={row.original.role === 'admin'}
            >
              Delete
            </button>
            {row.original.role === 'shipper' && (
              <Link
                to={`/shipper-management/${row.original.id}`}
                className="action-button manage"
              >
                Manage
              </Link>
            )}
          </div>
        )
      }
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    setGlobalFilter,
  } = useTable(
    {
      columns,
      data: users
    },
    useGlobalFilter,
    useSortBy
  );

  const UserForm = ({ initialValues, onSubmit, title, submitText }) => (
    <Formik
      initialValues={initialValues}
      validationSchema={userSchema}
      onSubmit={onSubmit}
    >
      {({ errors, touched, isSubmitting }) => (
        <Form className="user-form">
          <h2>{title}</h2>
          
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <Field
              type="text"
              name="name"
              className={`form-control ${
                errors.name && touched.name ? 'is-invalid' : ''
              }`}
            />
            {errors.name && touched.name && (
              <div className="error-message">{errors.name}</div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <Field
              type="text"
              name="username"
              className={`form-control ${
                errors.username && touched.username ? 'is-invalid' : ''
              }`}
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
              onClick={() => {
                setShowAddForm(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : submitText}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );

  if (loading) {
    return (
      <div className="manage-users-container">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="manage-users-container">
      <div className="page-header">
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
        <div className="modal-overlay">
          <div className="modal-content">
            <UserForm
              initialValues={{
                username: '',
                password: '',
                role: '',
                name: ''
              }}
              onSubmit={handleCreateUser}
              title="Add New User"
              submitText="Create User"
            />
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <UserForm
              initialValues={{
                username: editingUser.username,
                password: '',
                role: editingUser.role,
                name: editingUser.name || ''
              }}
              onSubmit={handleUpdateUser}
              title="Edit User"
              submitText="Update User"
            />
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="confirmation-dialog">
              <h2>Delete User</h2>
              <p>
                Are you sure you want to delete user "{deletingUser.username}"?
                This action cannot be undone.
              </p>
              <div className="dialog-actions">
                <button
                  className="cancel-button"
                  onClick={() => setDeletingUser(null)}
                >
                  Cancel
                </button>
                <button
                  className="delete-button"
                  onClick={handleDeleteUser}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-section">
        <div className="table-header">
          <input
            type="text"
            placeholder="Search users..."
            onChange={e => setGlobalFilter(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="table-container">
          <table {...getTableProps()} className="data-table">
            <thead>
              {headerGroups.map(headerGroup => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map(column => (
                    <th
                      {...column.getHeaderProps(column.getSortByToggleProps())}
                      className={
                        column.isSorted
                          ? column.isSortedDesc
                            ? 'sort-desc'
                            : 'sort-asc'
                          : ''
                      }
                    >
                      {column.render('Header')}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {rows.map(row => {
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()}>
                    {row.cells.map(cell => (
                      <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageUsers; 