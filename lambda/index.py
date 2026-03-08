import json
import boto3

s3 = boto3.client('s3')
cf = boto3.client('cloudfront')
BUCKET = 'bitcoincard-org'
DISTRIBUTION_ID = 'E3FV7WZASSQ8XS'
ADMIN_PASSWORD = '0'

DEFAULT_CONFIG = {
    'bitcoincard': True,
    'clock': True,
    'fluq': True,
    'awwf': True,
    'bitcoinpay': True,
    'music': True,
    'widget': True,
    'sufaria': True,
    'stas-swap': True,
}

HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


def handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    path = event.get('rawPath', '/')

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    if method == 'GET':
        key = 'config/blocks-draft.json' if path == '/draft' else 'config/blocks.json'
        try:
            obj = s3.get_object(Bucket=BUCKET, Key=key)
            body = obj['Body'].read().decode('utf-8')
            return {'statusCode': 200, 'headers': HEADERS, 'body': body}
        except s3.exceptions.NoSuchKey:
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(DEFAULT_CONFIG)}
        except Exception as e:
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(DEFAULT_CONFIG)}

    if method == 'POST':
        try:
            body = json.loads(event.get('body', '{}'))
        except Exception:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Invalid JSON'})}

        if body.get('password') != ADMIN_PASSWORD:
            return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Unauthorized'})}

        if path == '/publish':
            try:
                draft = s3.get_object(Bucket=BUCKET, Key='config/blocks-draft.json')
                draft_body = draft['Body'].read().decode('utf-8')
                s3.put_object(
                    Bucket=BUCKET,
                    Key='config/blocks.json',
                    Body=draft_body,
                    ContentType='application/json',
                )
                cf.create_invalidation(
                    DistributionId=DISTRIBUTION_ID,
                    InvalidationBatch={
                        'Paths': {'Quantity': 1, 'Items': ['/config/*']},
                        'CallerReference': str(context.aws_request_id),
                    },
                )
                return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'success': True})}
            except Exception as e:
                return {'statusCode': 500, 'headers': HEADERS, 'body': json.dumps({'error': str(e)})}

        if path == '/draft':
            try:
                blocks = body.get('blocks', {})
                s3.put_object(
                    Bucket=BUCKET,
                    Key='config/blocks-draft.json',
                    Body=json.dumps(blocks),
                    ContentType='application/json',
                )
                return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'success': True})}
            except Exception as e:
                return {'statusCode': 500, 'headers': HEADERS, 'body': json.dumps({'error': str(e)})}

    return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Not found'})}
