# DocumentDB Subnet Group
resource "aws_docdb_subnet_group" "main" {
  name       = "${var.app_name}-docdb-subnet-group"
  subnet_ids = var.db_subnet_ids

  tags = {
    Name = "${var.app_name}-docdb-subnet-group"
  }
}

# DocumentDB Cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier              = "${var.app_name}-cluster"
  engine                          = "docdb"
  master_username                 = var.master_username
  master_password                 = var.master_password
  backup_retention_period         = var.environment == "prod" ? 30 : 1
  preferred_backup_window         = "03:00-04:00"
  skip_final_snapshot             = var.skip_final_snapshot
  final_snapshot_identifier       = var.skip_final_snapshot ? null : "${var.app_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  storage_encrypted               = true
  kms_key_id                      = aws_kms_key.documentdb.arn
  enabled_cloudwatch_logs_exports = ["audit"]
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name
  vpc_security_group_ids          = [var.security_group_id]
  engine_version                  = var.engine_version
  deletion_protection             = var.environment == "prod"

  tags = {
    Name = "${var.app_name}-docdb-cluster"
  }
}

# DocumentDB Cluster Parameter Group
resource "aws_docdb_cluster_parameter_group" "main" {
  name        = "${var.app_name}-docdb-params"
  family      = "docdb5.0"
  description = "DocumentDB cluster parameter group"

  # TLS enforcement
  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = {
    Name = "${var.app_name}-docdb-params"
  }
}

# DocumentDB Cluster Instances
resource "aws_docdb_cluster_instance" "main" {
  count                      = var.cluster_size
  cluster_identifier         = aws_docdb_cluster.main.id
  instance_class             = var.instance_class
  engine                     = "docdb"
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.app_name}-docdb-instance-${count.index + 1}"
  }
}

# KMS Key for encryption
resource "aws_kms_key" "documentdb" {
  description             = "KMS key for ${var.app_name} DocumentDB encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.app_name}-documentdb-kms"
  }
}

resource "aws_kms_alias" "documentdb" {
  name          = "alias/${var.app_name}-documentdb"
  target_key_id = aws_kms_key.documentdb.key_id
}

# CloudWatch Alarm for DocumentDB CPU
resource "aws_cloudwatch_metric_alarm" "documentdb_cpu" {
  alarm_name          = "${var.app_name}-documentdb-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/DocDB"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when DocumentDB CPU is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.main.cluster_identifier
  }
}
