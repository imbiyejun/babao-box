import { Modal, Image, Typography, Divider, Space, Tag } from 'antd'
import {
  UserOutlined,
  MailOutlined,
  TagOutlined,
  AlipayCircleOutlined,
  WechatOutlined
} from '@ant-design/icons'
import alipayQR from '../assets/images/alipay.jpg'
import wechatpayQR from '../assets/images/wechatpay.jpg'

const { Text, Title } = Typography

interface AboutModalProps {
  open: boolean
  version: string
  onClose: () => void
}

function AboutModal({ open, version, onClose }: AboutModalProps): React.ReactElement {
  return (
    <Modal
      title="关于八宝盒"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={500}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
          八宝盒
        </Title>
        <Text
          type="secondary"
          style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}
        >
          一款实用的离线工具集合
        </Text>

        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text>
            <TagOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            版本：<Tag color="blue">{version}</Tag>
          </Text>
          <Text>
            <UserOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            作者：imbiyejun
          </Text>
          <Text>
            <MailOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            联系方式：imbiyejun@163.com
          </Text>
        </Space>

        <Divider style={{ margin: '12px 0' }}>打赏作者</Divider>

        <Image.PreviewGroup>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <Image
                src={alipayQR}
                width={180}
                style={{ borderRadius: 8 }}
                alt="支付宝"
              />
              <div style={{ marginTop: 8 }}>
                <AlipayCircleOutlined style={{ color: '#1677ff', marginRight: 4 }} />
                <Text>支付宝</Text>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Image
                src={wechatpayQR}
                width={180}
                style={{ borderRadius: 8 }}
                alt="微信支付"
              />
              <div style={{ marginTop: 8 }}>
                <WechatOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                <Text>微信支付</Text>
              </div>
            </div>
          </div>
        </Image.PreviewGroup>
      </Space>
    </Modal>
  )
}

export default AboutModal
