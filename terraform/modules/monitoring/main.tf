# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name              = "${var.app_name}-${var.environment}-alerts"
  display_name      = "Alerts for ${var.app_name}"
  kms_master_key_id = "alias/aws/sns"

  tags = {
    Name = "${var.app_name}-alerts"
  }
}

# Email subscription (user must confirm)
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ============ ECS Alarms ============

# ECS Service - No healthy tasks
resource "aws_cloudwatch_metric_alarm" "ecs_no_healthy_tasks" {
  alarm_name          = "${var.app_name}-ecs-no-healthy-tasks"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthyTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "Alert when no healthy ECS tasks"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }
}

# ECS Service - Task failure rate high
resource "aws_cloudwatch_metric_alarm" "ecs_task_failures" {
  alarm_name          = "${var.app_name}-ecs-task-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = "300"
  statistic           = "Average"
  threshold           = var.max_task_count
  alarm_description   = "Alert when task count exceeds max (indicates scaling failure)"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = var.ecs_service_name
    ClusterName = var.ecs_cluster_name
  }
}

# ============ ALB Alarms ============

# ALB - High error rate
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.app_name}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert when ALB sees many 5xx errors"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_name
  }
}

# ALB - Unhealthy targets
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "${var.app_name}-alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Alert when targets become unhealthy"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = var.alb_name
    TargetGroup  = var.target_group_name
  }
}

# ============ DocumentDB Alarms ============

# DocumentDB - High CPU
resource "aws_cloudwatch_metric_alarm" "documentdb_cpu" {
  alarm_name          = "${var.app_name}-documentdb-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/DocDB"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Alert when DocumentDB CPU is high"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = var.documentdb_cluster_id
  }
}

# DocumentDB - Replication lag
resource "aws_cloudwatch_metric_alarm" "documentdb_replication_lag" {
  alarm_name          = "${var.app_name}-documentdb-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "DBInstanceReplicationLag"
  namespace           = "AWS/DocDB"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "5000" # 5 seconds
  alarm_description   = "Alert when database replication is lagging"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = var.documentdb_cluster_id
  }
}

# DocumentDB - Connection limit
resource "aws_cloudwatch_metric_alarm" "documentdb_connections" {
  alarm_name          = "${var.app_name}-documentdb-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/DocDB"
  period              = "300"
  statistic           = "Average"
  threshold           = "500"
  alarm_description   = "Alert when database has many connections"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBClusterIdentifier = var.documentdb_cluster_id
  }
}

# ============ CloudWatch Dashboard ============

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.app_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["ECS/ContainerInsights", "HealthyTaskCount", { stat = "Average" }],
            [".", "TaskCount", { stat = "Average" }],
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            [".", "RequestCount", { stat = "Sum" }],
            ["AWS/DocDB", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseConnections", { stat = "Average" }],
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Application Health Overview"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { stat = "Sum" }],
            [".", "HTTPCode_Target_4XX_Count", { stat = "Sum" }],
            [".", "HTTPCode_ELB_5XX_Count", { stat = "Sum" }],
          ]
          period = 60
          stat   = "Sum"
          region = var.aws_region
          title  = "HTTP Errors"
        }
      },
      {
        type = "log"
        properties = {
          query  = "fields @timestamp, @message | stats count() by bin(5m)"
          region = var.aws_region
          title  = "ECS Logs (last hour)"
        }
      }
    ]
  })
}
