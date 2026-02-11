import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Card, Form, Input, Button, Select, Radio, Typography } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text, Link } = Typography;

const GRADES = [
  { value: 'middle-1', label: '중학교 1학년' },
  { value: 'middle-2', label: '중학교 2학년' },
  { value: 'middle-3', label: '중학교 3학년' },
  { value: 'high-1', label: '고등학교 1학년' },
  { value: 'high-2', label: '고등학교 2학년 (문과)' },
  { value: 'high-2-science', label: '고등학교 2학년 (이과)' },
  { value: 'high-3', label: '고등학교 3학년 (문과)' },
  { value: 'high-3-science', label: '고등학교 3학년 (이과)' },
];

const RegisterForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await register({
        email: values.email,
        password: values.password,
        name: values.name,
        grade: values.grade,
        role: values.role || 'student',
      });
      message.success('회원가입 성공');
    } catch (err: unknown) {
      if (err instanceof Error) {
        message.error(err.message || '회원가입 실패');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-color, #f5f5f5)',
    }}>
      <Card style={{ width: 450, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 4 }}>StudyLog</Title>
          <Text type="secondary">새 계정을 만드세요</Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ role: 'student' }}>
          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: '이름을 입력하세요' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="이름" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="이메일"
            rules={[
              { required: true, message: '이메일을 입력하세요' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="이메일" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="비밀번호"
            rules={[
              { required: true, message: '비밀번호를 입력하세요' },
              { min: 4, message: '비밀번호는 4자 이상이어야 합니다' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" size="large" />
          </Form.Item>

          <Form.Item name="grade" label="학년">
            <Select placeholder="학년 선택 (선택사항)" allowClear options={GRADES} size="large" />
          </Form.Item>

          <Form.Item name="role" label="역할">
            <Radio.Group>
              <Radio value="student">학생</Radio>
              <Radio value="parent">보호자</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              회원가입
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text>이미 계정이 있으신가요? </Text>
          <Link onClick={() => navigate('/login')}>로그인</Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterForm;
